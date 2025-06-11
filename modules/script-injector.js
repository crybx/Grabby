// ScriptInjector - Handles script injection and content grabbing
export class ScriptInjector {
    constructor(downloadHandler) {
        this.downloadHandler = downloadHandler;
    }

    // Function to inject scripts sequentially and then execute a callback function
    async injectGrabbingScriptsAndExecute(tabId) {
        const scripts = ["utils.js", "pre-grab-actions.js", "post-grab-actions.js", "grabbers.js", "grabber-core.js"];

        // First, check if GrabbyCore is already available (if so, we can skip injecting scripts)
        const coreCheckResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return typeof GrabbyCore !== "undefined";
            }
        });

        const grabbyExists = coreCheckResult[0].result;

        // If GrabbyCore already exists, just run the grabbing function
        if (grabbyExists) {
            console.log("GrabbyCore already exists, skipping script injection");
            return chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Use the shared core functionality
                    return GrabbyCore.grabFromWebsite().then(result => {
                        if (result && result.filename && result.content) {
                            return GrabbyCore.handleContentDownload(result.filename, result.content);
                        }
                        return false;
                    });
                }
            });
        }

        // Helper function to inject scripts sequentially
        const injectScriptsSequentially = async (index) => {
            if (index >= scripts.length) {
                // All scripts injected, now execute the main function
                return chrome.scripting.executeScript({
                    target: { tabId: tabId },
                    func: () => {
                        // Use the shared core functionality
                        return GrabbyCore.grabFromWebsite().then(result => {
                            if (result && result.filename && result.content) {
                                return GrabbyCore.handleContentDownload(result.filename, result.content);
                            }
                            return false;
                        });
                    }
                });
            }

            // Check if this script needs to be injected
            const scriptName = scripts[index].replace(".js", "");
            const variablesToCheck = {
                "utils": ["removeTag", "unwrapTag"], // Functions from utils.js
                "pre-grab-actions": ["PreGrabActions"], // Object from pre-grab-actions.js
                "post-grab-actions": ["PostGrabActions"], // Object from post-grab-actions.js
                "grabbers": ["grabRidi", "grabPatreon"], // Functions from grabbers.js
                "grabber-core": ["GrabbyCore"] // Object from grabber-core.js
            };

            const checkResult = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (vars) => {
                    // For each variable to check, see if it exists in the global scope
                    return vars.some(v => typeof window[v] !== "undefined" ||
                        (typeof window.GrabbyCore !== "undefined" &&
                            typeof window.GrabbyCore[v] !== "undefined"));
                },
                args: [variablesToCheck[scriptName] || []]
            });

            const scriptExists = checkResult[0].result;

            if (scriptExists) {
                console.log(`Script ${scripts[index]} appears to be already loaded, skipping`);
                // Skip to the next script
                return injectScriptsSequentially(index + 1);
            }

            // Inject the current script
            console.log(`Injecting ${scripts[index]}`);
            return chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [scripts[index]]
            }).then(() => {
                // Move to the next script
                return injectScriptsSequentially(index + 1);
            }).catch(error => {
                console.error(`Failed to inject ${scripts[index]}:`, error);
                throw error;
            });
        };

        // Start the injection sequence with the first script
        return injectScriptsSequentially(0);
    }

    async getTabId(message, sender) {
        let tabId = message?.tabId;

        if (!tabId && sender?.tab) {
            tabId = sender.tab.id;
        }

        if (!tabId) {
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            if (tab) {
                tabId = tab.id;
            }
        }

        if (!tabId) {
            console.error("No tab ID found for content grabbing");
            return null;
        }

        return tabId;
    }

    async grabContent(message, sender) {
        let tabId = await this.getTabId(message, sender);
        if (tabId) {
            try {
                // Get tab info to check if it's a file URL
                const tab = await chrome.tabs.get(tabId);
                
                // Inject scripts and execute grabbing function
                await this.injectGrabbingScriptsAndExecute(tabId);
            } catch (error) {
                console.error("Error during script injection or execution:", error);
                // If it's a file URL and scripting fails, we might need a different approach
                if (error.message && error.message.includes("Cannot access")) {
                    console.error("Cannot access file:// URL. Make sure 'Allow access to file URLs' is enabled for this extension.");
                }
            }
        }
    }
}
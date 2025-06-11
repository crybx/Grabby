// ScriptInjector - Handles script injection and content grabbing
export class ScriptInjector {
    constructor() {
        // No dependencies needed - just handles script injection
    }

    // Execute the grabbing function using GrabbyCore
    async executeGrabbingFunction(tabId) {
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

    // Function to inject scripts sequentially without executing grab
    async injectScriptsSequentially(tabId) {
        const scripts = [
            "content-scripts/utils.js",
            "content-scripts/pre-grab-actions.js",
            "content-scripts/post-grab-actions.js",
            "content-scripts/grabbers.js",
            "website-configs.js",
            "content-scripts/grabber-core.js"
        ];

        // First, check if GrabbyCore is already available (if so, we can skip injecting scripts)
        const coreCheckResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return typeof GrabbyCore !== "undefined";
            }
        });

        const grabbyExists = coreCheckResult[0].result;

        // If GrabbyCore already exists, just return
        if (grabbyExists) {
            console.log("GrabbyCore already exists, skipping script injection");
            return;
        }

        // Helper function to inject scripts sequentially
        const injectSequentially = async (index) => {
            if (index >= scripts.length) {
                // All scripts injected
                return;
            }

            // Check if this script needs to be injected
            const scriptName = scripts[index].replace("content-scripts/", "").replace(".js", "");
            const variablesToCheck = {
                "website-configs": ["WEBSITE_CONFIGS", "findMatchingConfig"], // Objects from website-configs.js
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
                return injectSequentially(index + 1);
            }

            // Inject the current script
            console.log(`Injecting ${scripts[index]}`);
            return chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [scripts[index]]
            }).then(() => {
                // Move to the next script
                return injectSequentially(index + 1);
            }).catch(error => {
                console.error(`Failed to inject ${scripts[index]}:`, error);
                throw error;
            });
        };

        // Start the injection sequence with the first script
        return injectSequentially(0);
    }

    // Function to inject scripts sequentially and then execute a callback function
    async injectGrabbingScriptsAndExecute(tabId) {
        // First inject all scripts
        await this.injectScriptsSequentially(tabId);
        
        // Then execute the grabbing function
        return await this.executeGrabbingFunction(tabId);
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
}
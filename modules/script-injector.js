// ScriptInjector - Handles script injection and content grabbing
export class ScriptInjector {
    constructor() {
        // No dependencies needed - just handles script injection
    }

    // Execute the grabbing function using GrabbyCore
    async executeGrabbingFunction(tabId, isBulkGrab = false) {
        await chrome.scripting.executeScript({
            target: {tabId: tabId},
            func: (isBulkGrab) => {
                GrabbyCore.grabFromWebsite(isBulkGrab).then();
            },
            args: [isBulkGrab]
        });
    }

    // Function to inject scripts sequentially without executing grab
    async injectScriptsSequentially(tabId) {
        const scripts = [
            "content-scripts/utils.js",
            "content-scripts/grab-actions.js",
            "content-scripts/grabbers.js",
            "website-configs.js",
            "parser-registry.js",
            "content-scripts/grabber-core.js"
        ];

        // Check what scripts are already available
        const availabilityCheck = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    grabbyCore: typeof GrabbyCore !== "undefined",
                    grabActions: typeof GrabActions !== "undefined",
                    storyManager: typeof StoryManager !== "undefined",
                    websiteConfigs: typeof findMatchingConfig !== "undefined"
                };
            }
        });

        const availability = availabilityCheck[0].result;

        // If all essential scripts are available, we can skip injection
        if (availability.grabbyCore && availability.grabActions && availability.websiteConfigs) {
            return;
        }

        // Helper function to inject scripts sequentially
        const injectSequentially = async (index) => {
            if (index >= scripts.length) {
                // All scripts injected
                return;
            }

            // Check if this script needs to be injected
            const scriptName = scripts[index].replace("content-scripts/", "").replace("modules/", "").replace(".js", "");
            const variablesToCheck = {
                "website-configs": ["WEBSITE_CONFIGS", "findMatchingConfig"], // Objects from website-configs.js
                "utils": ["removeTag", "unwrapTag"], // Functions from utils.js
                "grab-actions": ["GrabActions"], // Object from grab-actions.js
                "grabbers": ["grabRidi", "grabPatreon"], // Functions from grabbers.js
                "parser-registry": ["PARSER_REGISTRY"], // Object from parser-registry.js
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
                // Skip to the next script
                return injectSequentially(index + 1);
            }

            // Inject the current script
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
    async injectGrabbingScriptsAndExecute(tabId, isBulkGrab = false) {
        // First inject all scripts
        await this.injectScriptsSequentially(tabId);
        
        // Then execute the grabbing function
        await this.executeGrabbingFunction(tabId, isBulkGrab);
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

    // Inject WebToEpub dependencies (util.js + parser-adapter.js)
    async injectWebToEpubDependencies(tabId) {
        try {
            // Check if already injected
            const infraCheck = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => ({
                    Parser: typeof Parser !== "undefined",
                    parserFactory: typeof parserFactory !== "undefined",
                    util: typeof util !== "undefined"
                })
            });
            
            if (!infraCheck[0].result.Parser) {
                // WebToEpub dependencies for on-demand injection
                const webToEpubDependencies = [
                    "epub/js/Util.js",                      // WebToEpub utilities (note capital U)
                    "content-scripts/parser-adapter.js"     // Minimal infrastructure
                ];
                
                // Inject dependencies in order
                for (const script of webToEpubDependencies) {
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        files: [script]
                    });
                }
            }
        } catch (error) {
            console.error("Error in injectWebToEpubDependencies:", error);
            throw error;
        }
    }

    // Inject specific WebToEpub parser
    async injectWebToEpubParser(tabId, parserFile) {
        try {
            // Check if this parser file was already injected by checking for a parser from that file
            const checkResult = await chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: (filename) => {
                    // Check if parserFactory has any parsers registered (indicating injection already happened)
                    return typeof parserFactory !== "undefined" && 
                           parserFactory.parsers && 
                           parserFactory.parsers.size > 0;
                },
                args: [parserFile]
            });
            
            if (checkResult[0].result) {
                return;
            }
            
            // Inject the parser file
            await chrome.scripting.executeScript({
                target: { tabId: tabId },
                files: [`epub/js/parsers/${parserFile}`]
            });
            
        } catch (error) {
            console.error("Error in injectWebToEpubParser:", error);
            throw error;
        }
    }
}
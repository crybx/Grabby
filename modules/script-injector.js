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
                GrabbyCore.grabFromWebsite(isBulkGrab).then().catch(error => {
                    console.error("Error during grab:", error);
                });
            },
            args: [isBulkGrab]
        });
    }

    // Function to inject scripts without executing grab
    async injectScriptsSequentially(tabId) {
        const scripts = [
            "content-scripts/utils.js",
            "content-scripts/grab-actions.js",
            "content-scripts/grabbers.js",
            "website-configs.js",
            "parser-registry.js",
            "epub/dompurify/dist/purify.min.js",
            "content-scripts/grabber-core.js"
        ];

        // Single check for all essential scripts
        const availabilityCheck = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                return {
                    grabbyCore: typeof GrabbyCore !== "undefined",
                    grabActions: typeof GrabActions !== "undefined",
                    websiteConfigs: typeof findMatchingConfig !== "undefined"
                };
            }
        });

        const availability = availabilityCheck[0].result;

        // If all essential scripts are available, skip injection
        if (availability.grabbyCore && availability.grabActions && availability.websiteConfigs) {
            return;
        }

        // Inject all scripts in one call (Chrome executes them in array order)
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: scripts
        });
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
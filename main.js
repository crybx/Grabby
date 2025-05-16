// this file is loaded by grabby.html

function injectScriptsAndExecute(tabId) {
    const scripts = ['utils.js', 'grabbers.js', 'grabber-core.js'];

    // Helper function to inject scripts sequentially
    async function injectScriptsSequentially(index) {
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

        // Inject the current script
        return chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scripts[index]]
        }).then(() => {
            // Move to the next script
            return injectScriptsSequentially(index + 1);
        });
    }

    // Start the injection sequence with the first script
    return injectScriptsSequentially(0);
}

// Initialize content grabbing
chrome.windows.getCurrent(function(currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function(activeTabs) {
        if (!activeTabs || activeTabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        activeTabs.forEach(function(tab) {
            injectScriptsAndExecute(tab.id).then(() => {
                console.log("Scripts injected and executed successfully");
            }).catch(error => {
                console.error("Error injecting scripts:", error);
            });
        });
    });
});
// this file is loaded by grabby.html

// Initialize content grabbing by sending a message to the background script
chrome.windows.getCurrent(function(currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function(activeTabs) {
        if (!activeTabs || activeTabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        // For each active tab, send a message to the background script to grab content
        activeTabs.forEach(function(tab) {
            chrome.runtime.sendMessage(
                {
                    target: 'background',
                    type: 'grab-content',
                    tabId: tab.id
                },
                function(response) {
                    if (response && response.success) {
                        console.log("Content grabbing initiated successfully");
                    } else {
                        console.error("Content grabbing failed:", response ? response.error : "Unknown error");
                    }
                }
            );
        });
    });
});
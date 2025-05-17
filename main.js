// this file used to be loaded by popup.html to trigger grabbing

// Initialize content grabbing by sending a message to the background script
chrome.windows.getCurrent(function(currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function(activeTabs) {
        if (!activeTabs || activeTabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        // There's only one active tab per window
        const activeTab = activeTabs[0];

        chrome.runtime.sendMessage({
            target: 'background',
            type: 'grabContent',
            tabId: activeTab.id
        });
    });
});

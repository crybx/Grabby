document.addEventListener("DOMContentLoaded", function() {
    const closePageLink = document.getElementById("close-page");
    const openStoryTrackerBtn = document.getElementById("open-story-tracker-btn");
    const showFloatingButtonCheckbox = document.getElementById("show-floating-button");
    const exportUsernameInput = document.getElementById("export-username");

    if (closePageLink) {
        closePageLink.addEventListener("click", function(e) {
            e.preventDefault();
            window.close();
        });
    }

    if (openStoryTrackerBtn) {
        openStoryTrackerBtn.addEventListener("click", function(e) {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL("pages/story-tracker.html") });
        });
    }

    // Load and save floating button setting
    if (showFloatingButtonCheckbox) {
        // Load current setting
        chrome.storage.sync.get(["showFloatingButton"], function(result) {
            showFloatingButtonCheckbox.checked = result.showFloatingButton !== false; // Default to true
        });

        // Save setting when changed
        showFloatingButtonCheckbox.addEventListener("change", function() {
            chrome.storage.sync.set({
                showFloatingButton: this.checked
            });
        });
    }

    // Load and save export username setting
    if (exportUsernameInput) {
        // Load current setting
        chrome.storage.local.get(["exportUsername"], function(result) {
            if (result.exportUsername) {
                exportUsernameInput.value = result.exportUsername;
            }
        });

        // Save setting when changed (with debounce)
        let saveTimeout;
        exportUsernameInput.addEventListener("input", function() {
            clearTimeout(saveTimeout);
            const username = this.value.trim();
            
            saveTimeout = setTimeout(() => {
                if (username) {
                    chrome.storage.local.set({
                        exportUsername: username
                    });
                } else {
                    // Remove the setting if empty
                    chrome.storage.local.remove("exportUsername");
                }
            }, 500); // Save after 500ms of no typing
        });
    }
});
document.addEventListener("DOMContentLoaded", function() {
    const closePageLink = document.getElementById("close-page");
    const openStoryTrackerBtn = document.getElementById("open-story-tracker-btn");
    const showFloatingButtonCheckbox = document.getElementById("show-floating-button");

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
});
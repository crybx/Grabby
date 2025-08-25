// Report the current page URL to background
chrome.runtime.sendMessage({
    target: "background",
    type: "reportPageUrl",
    url: window.location.href
}).then();

// Create and add the clipboard button to the page
function addGrabbyButton() {
    // Check if button already exists
    if (document.getElementById("grabby-button")) {
        return;
    }

    // Check if floating button is enabled
    chrome.storage.sync.get(["showFloatingButton"], function(result) {
        const showButton = result.showFloatingButton !== false; // Default to true
        
        if (!showButton) {
            return; // Don't show the button if disabled
        }

        // Create the button element
        const button = document.createElement("div");
        button.id = "grabby-button";
        button.className = "grabby-button";
        button.title = "Grab content";

        const img = document.createElement("img");
        img.src = chrome.runtime.getURL("images/clipboard128.png");
        button.appendChild(img);

        // Add click handler to trigger grabbing action
        button.addEventListener("click", () => {
            // Show a quick visual feedback
            button.classList.add("clicked");

            // Send a message to the background script to grab content
            chrome.runtime.sendMessage({
                target: "background",
                type: "grabContent",
                // No need to specify tabId - the background script can get it from sender.tab.id
            });

            // Reset button after animation
            setTimeout(() => {
                button.classList.remove("clicked");
            }, 300);
        });

        // Add button to the document
        document.body.appendChild(button);
    });
}

// Function to remove the button if it exists
function removeGrabbyButton() {
    const button = document.getElementById("grabby-button");
    if (button) {
        button.remove();
    }
}

// Listen for storage changes to show/hide button dynamically
chrome.storage.onChanged.addListener(function(changes, namespace) {
    if (namespace === "sync" && changes.showFloatingButton) {
        if (changes.showFloatingButton.newValue === false) {
            removeGrabbyButton();
        } else {
            addGrabbyButton();
        }
    }
});

// Run the function when the DOM is fully loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addGrabbyButton);
} else {
    addGrabbyButton();
}
// Create and add the clipboard button to the page
function addGrabbyButton() {
    // Check if button already exists
    if (document.getElementById("grabby-button")) {
        return;
    }

    // Create the button element
    const button = document.createElement("div");
    button.id = "grabby-button";
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
}

// Run the function when the DOM is fully loaded
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", addGrabbyButton);
} else {
    addGrabbyButton();
}
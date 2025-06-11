// This script handles any interactive functionality in the popup
// Currently it's minimal but can be expanded as settings needs grow

document.addEventListener("DOMContentLoaded", function() {
    console.log("Grabby popup opened");
    
    // Get UI elements
    const grabbyButton = document.getElementById("grabby-button");
    const startBulkBtn = document.getElementById("start-bulk-grab");
    const stopBulkBtn = document.getElementById("stop-bulk-grab");
    const clearStatusBtn = document.getElementById("clear-status");
    const pageCountInput = document.getElementById("page-count");
    const delayInput = document.getElementById("delay-seconds");
    const statusDisplay = document.getElementById("bulk-status");
    const statusText = document.getElementById("status-text");
    const progressFill = document.getElementById("progress-fill");
    const openStoryTrackerBtn = document.getElementById("open-story-tracker");
    
    // Add click handler to the clipboard button
    if (grabbyButton) {
        grabbyButton.addEventListener("click", () => {
            // Show a quick visual feedback
            grabbyButton.classList.add("clicked");
            
            // Send a message to the background script to grab content
            chrome.runtime.sendMessage({
                target: "background",
                type: "grabContent"
            });
            
            // Reset button after animation
            setTimeout(() => {
                grabbyButton.classList.remove("clicked");
            }, 300);
            
            // Close the popup after clicking
            window.close();
        });
    }
    
    // Add click handler for start bulk grab
    if (startBulkBtn) {
        startBulkBtn.addEventListener("click", () => {
            const pageCount = parseInt(pageCountInput.value);
            const delaySeconds = parseInt(delayInput.value);
            
            if (pageCount < 1 || pageCount > 1000) {
                alert("Page count must be between 1 and 1000");
                return;
            }
            
            if (delaySeconds < 1 || delaySeconds > 3600) {
                alert("Delay must be between 1 and 3600 seconds (1 hour)");
                return;
            }
            
            // Send start bulk grab message
            chrome.runtime.sendMessage({
                target: "background",
                type: "startBulkGrab",
                pageCount: pageCount,
                delaySeconds: delaySeconds
            });
            
            // Update UI state
            updateUIForBulkGrabbing(true);
            updateStatus("Starting bulk grab...", 0);
            
            // Clear any previous completion status
            statusDisplay.style.display = "block";
        });
    }
    
    // Add click handler for stop bulk grab
    if (stopBulkBtn) {
        stopBulkBtn.addEventListener("click", () => {
            chrome.runtime.sendMessage({
                target: "background",
                type: "stopBulkGrab"
            });
            
            updateUIForBulkGrabbing(false);
            updateStatus("Stopped", 0);
        });
    }
    
    // Add click handler for clear status button
    if (clearStatusBtn) {
        clearStatusBtn.addEventListener("click", () => {
            // Send message to background to clear the stored state
            chrome.runtime.sendMessage({
                target: "background",
                type: "clearBulkGrabStatus"
            });
            
            // Hide status display and reset form
            statusDisplay.style.display = "none";
            pageCountInput.value = "5";
            delayInput.value = "3";
            updateStatus("Ready", 0);
        });
    }
    
    // Add click handler for story tracker button
    if (openStoryTrackerBtn) {
        openStoryTrackerBtn.addEventListener("click", () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL("story-tracker.html")
            });
            window.close();
        });
    }
    
    // Listen for status updates from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
        if (message.target === "popup") {
            switch (message.type) {
            case "bulkGrabStatus":
                updateStatus(message.status, message.progress);
                break;
            case "bulkGrabComplete":
                updateUIForBulkGrabbing(false);
                updateStatus("Completed!", 100);
                // Don't auto-hide - let user manually clear with × button
                break;
            case "bulkGrabStopped":
                updateUIForBulkGrabbing(false);
                updateStatus("Stopped", 0);
                // Don't auto-hide - let user manually clear with × button
                break;
            }
        }
    });
    
    // Restore bulk grab status for current tab on popup open
    // Get current tab and restore its specific state
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            const tabId = tabs[0].id;
            const storageKey = `bulkGrabState_${tabId}`;
            
            chrome.storage.session.get(storageKey, (result) => {
                const state = result[storageKey];
                if (state) {
                    // Restore form values
                    if (state.totalPages) {
                        pageCountInput.value = state.totalPages;
                    }
                    if (state.delaySeconds) {
                        delayInput.value = state.delaySeconds;
                    }
                    
                    // Restore UI state
                    if (state.isRunning) {
                        updateUIForBulkGrabbing(true);
                        const progress = Math.round((state.currentPage / state.totalPages) * 100);
                        updateStatus(`Grabbing page ${state.currentPage} of ${state.totalPages}`, progress);
                    } else if (state.lastStatus && state.lastStatus !== "Ready") {
                        statusDisplay.style.display = "block";
                        updateStatus(state.lastStatus, state.lastProgress || 0);
                    }
                }
            });
        }
    });
    
    function updateUIForBulkGrabbing(isRunning) {
        startBulkBtn.disabled = isRunning;
        stopBulkBtn.disabled = !isRunning;
        pageCountInput.disabled = isRunning;
        delayInput.disabled = isRunning;
        
        if (isRunning) {
            statusDisplay.style.display = "block";
        }
    }
    
    function updateStatus(status, progress) {
        statusText.textContent = status;
        progressFill.style.width = progress + "%";
    }
});
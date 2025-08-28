// This script handles any interactive functionality in the popup
// Currently it's minimal but can be expanded as settings needs grow

document.addEventListener("DOMContentLoaded", async function() {
    // Check if current tab supports bulk grabbing
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let supportsAutoNav = false;
    
    if (tab && tab.url && typeof findMatchingConfig !== "undefined") {
        // Check directly using findMatchingConfig from website-configs.js
        const config = findMatchingConfig(tab.url);
        supportsAutoNav = config?.autoNav?.enabled === true;
    }
    
    // Hide re-grab button by default, then check if duplicate was detected
    const regrabButtonContainer = document.querySelector("#regrab-button")?.parentElement;
    if (regrabButtonContainer) {
        regrabButtonContainer.style.display = "none";
        
        // Check if duplicate was already detected for this tab
        if (tab && tab.id) {
            // Check session storage directly - much more reliable than message passing
            chrome.storage.session.get([`duplicateTab_${tab.id}`], (result) => {
                const isDuplicate = result[`duplicateTab_${tab.id}`] === true;
                if (isDuplicate) {
                    regrabButtonContainer.style.display = "block";
                }
            });
        }
    }
    
    // Show bulk grabbing section only if supported
    if (supportsAutoNav) {
        const bulkSection = document.querySelector(".bulk-section");
        const bulkSeparator = document.querySelector(".bulk-separator");
        if (bulkSection) {
            bulkSection.style.display = "block";
        }
        if (bulkSeparator) {
            bulkSeparator.style.display = "block";
        }
    } else {
        // Remove extra spacing when bulk section is hidden
        const keyboardSection = document.querySelector(".settings-section:has(.shortcut)");
        if (keyboardSection) {
            keyboardSection.style.marginBottom = "0";
        }
    }
    
    // Get UI elements
    const grabButton = document.getElementById("grab-button");
    const regrabButton = document.getElementById("regrab-button");
    const storyTrackerButton = document.getElementById("story-tracker-button");
    const addToTrackerButton = document.getElementById("add-to-tracker-button");
    const optionsButton = document.getElementById("options-button");
    const supportButton = document.getElementById("support-button");
    const epubButton = document.getElementById("epub-button");
    const startBulkBtn = document.getElementById("start-bulk-grab");
    const stopBulkBtn = document.getElementById("stop-bulk-grab");
    const clearStatusBtn = document.getElementById("clear-status");
    const pageCountInput = document.getElementById("page-count");
    const delayInput = document.getElementById("delay-seconds");
    const statusDisplay = document.getElementById("bulk-status");
    const statusText = document.getElementById("status-text");
    const progressFill = document.getElementById("progress-fill");
    const popupShowFloatingButtonCheckbox = document.getElementById("popup-show-floating-button");
    
    // Load and save floating button setting
    if (popupShowFloatingButtonCheckbox) {
        // Load current setting
        chrome.storage.sync.get(["showFloatingButton"], function(result) {
            popupShowFloatingButtonCheckbox.checked = result.showFloatingButton !== false; // Default to true
        });

        // Save setting when changed
        popupShowFloatingButtonCheckbox.addEventListener("change", function() {
            chrome.storage.sync.set({
                showFloatingButton: this.checked
            });
        });
    }
    
    // Add click handler for the grab button
    if (grabButton) {
        grabButton.addEventListener("click", () => {
            // Send a message to the background script to grab content
            chrome.runtime.sendMessage({
                target: "background",
                type: "grabContent"
            });
            
            // Close the popup after clicking
            window.close();
        });
    }
    
    // Add click handler for the re-grab button (bypasses duplicate check)
    if (regrabButton) {
        regrabButton.addEventListener("click", () => {
            // Send a message to the background script to grab content, ignoring duplicate check
            chrome.runtime.sendMessage({
                target: "background",
                type: "grabContent",
                ignoreDuplicateCheck: true
            });
            
            // Close the popup after clicking
            window.close();
        });
    }
    
    // Add click handler for story tracker button
    if (storyTrackerButton) {
        storyTrackerButton.addEventListener("click", () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL("pages/story-tracker.html")
            });
            window.close();
        });
    }
    
    // Add click handler for add to tracker button
    if (addToTrackerButton) {
        addToTrackerButton.addEventListener("click", async () => {
            try {
                // Get current tab
                const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
                
                if (!currentTab || !currentTab.url) {
                    alert("Unable to get current page information.");
                    return;
                }
                
                // Create story object
                const story = {
                    title: currentTab.title || "Untitled Story",
                    mainStoryUrl: currentTab.url,
                    dateAdded: new Date().toISOString(),
                    tags: ["popup-added"] // Special tag to identify stories added via popup
                };
                
                // Send message to background script to add story (fire and forget)
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "addStoryToTracker",
                    story: story
                });
                
                // Close popup immediately
                window.close();
                
            } catch (error) {
                console.error("Error adding story to tracker:", error);
                alert("Error adding story to tracker: " + error.message);
            }
        });
    }
    
    // Add click handler for options button
    if (optionsButton) {
        optionsButton.addEventListener("click", () => {
            chrome.tabs.create({
                url: chrome.runtime.getURL("pages/options.html")
            });
            window.close();
        });
    }
    
    // Add click handler for support button
    if (supportButton) {
        supportButton.addEventListener("click", () => {
            chrome.tabs.create({
                url: "https://ko-fi.com/crybx"
            });
            window.close();
        });
    }
    
    // Add click handler for epub button
    if (epubButton) {
        epubButton.addEventListener("click", async () => {
            // Get current tab ID to pass for epub creation
            const [currentTab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const epubUrl = chrome.runtime.getURL("epub/details.html") + "?id=" + currentTab.id;
            chrome.tabs.create({
                url: epubUrl
            });
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
        stopBulkBtn.addEventListener("click", async () => {
            // Get current tab to include URL in stop message
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            
            chrome.runtime.sendMessage({
                target: "background",
                type: "stopGrabbing",
                url: tab?.url,
                status: "Manually stopped by user"
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
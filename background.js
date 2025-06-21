// Main background script - coordinates all extension functionality
import { ScriptInjector } from "./modules/script-injector.js";
import { BulkGrabManager } from "./modules/bulk-grab-manager.js";
import { DownloadHandler } from "./modules/download-handler.js";
import { QueueManager } from "./modules/queue-manager.js";

// Initialize modules
const downloadHandler = new DownloadHandler();
const scriptInjector = new ScriptInjector();

// Handle grab content (for direct grabs)
async function handleGrabContent(message, sender) {
    const tabId = await scriptInjector.getTabId(message, sender);
    if (tabId) {
        try {
            // Perform the content grab - pass false for direct grab
            await scriptInjector.injectGrabbingScriptsAndExecute(tabId, false);
        } catch (error) {
            console.error("Error during grab content:", error);
        }
    }
}

// Handle grab content for bulk grabs
async function handleBulkGrabContent(message, sender) {
    const tabId = await scriptInjector.getTabId(message, sender);
    if (tabId) {
        try {
            // Perform the content grab - pass true for bulk grab
            await scriptInjector.injectGrabbingScriptsAndExecute(tabId, true);
        } catch (error) {
            console.error("Error during bulk grab content:", error);
        }
    }
}

// Create completion callback for bulk grab manager
const handleBulkGrabComplete = (tabId, success, message, isError = false, chaptersDownloaded = 0, isManualStop = false) => {
    queueManager.handleBulkGrabComplete(tabId, success, message, isError, chaptersDownloaded, isManualStop);
};

const bulkGrabManager = new BulkGrabManager(handleBulkGrabContent, handleBulkGrabComplete, scriptInjector);
const queueManager = new QueueManager(handleAutoGrab);

// Handle auto grab for individual stories
async function handleAutoGrab(message) {
    try {
        // Get auto-grab config to check if tab should be active
        // Simple domain matching to check activeTab setting without loading all grabber functions
        let shouldBeActive = false;
        try {
            const url = message.lastChapterUrl;
            shouldBeActive = queueManager.checkIfNeedsActiveTab(url);
        } catch (error) {
            console.warn("Could not determine activeTab setting, defaulting to false:", error);
        }
        
        // Open the last chapter URL in a new tab (active or background based on config)
        const tab = await chrome.tabs.create({
            url: message.lastChapterUrl,
            active: shouldBeActive
        });
        
        console.log(`Opened tab ${tab.id} for ${message.storyTitle}`);
        
        // Register tab with queue manager if story has an ID
        if (message.storyId) {
            queueManager.registerStoryTab(message.storyId, tab.id);
        }
        
        // Wait for tab to load, then start the auto-grab process
        chrome.tabs.onUpdated.addListener(function autoGrabListener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === "complete") {
                // Remove this listener
                chrome.tabs.onUpdated.removeListener(autoGrabListener);
                
                // Start the auto-grab process for this tab
                setTimeout(() => {
                    performAutoGrabSequence(tab.id, message);
                }, 2000); // Give page time to fully load
            }
        });
        
    } catch (error) {
        console.error(`Error in handleAutoGrab for ${message.storyTitle}:`, error);
    }
}

// Perform the auto-grab sequence: postGrab -> check URL change -> start bulk grab
async function performAutoGrabSequence(tabId, storyInfo) {
    try {
        console.log(`Performing auto-grab sequence for tab ${tabId}: ${storyInfo.storyTitle}`);
        
        // Get the current URL before post-grab action
        const initialTab = await chrome.tabs.get(tabId);
        const initialUrl = initialTab.url;
        
        // Inject scripts and run postGrab action to navigate to next chapter
        await scriptInjector.injectScriptsSequentially(tabId);
        
        // Run postGrab action to navigate to next chapter and get delay from config
        const configResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async function() {
                const config = findMatchingConfig(window.location.href);
                if (config && config.postGrab && typeof config.postGrab === "function") {
                    try {
                        await config.postGrab();
                        console.log("PostGrab action executed for auto-grab");

                        // Return delay from website-config
                        const delay = config.autoGrab?.defaultDelay || 10; // fallback to 10 seconds if not found
                        return delay * 1000; // convert to milliseconds
                    } catch (error) {
                        console.error("Error in postGrab action:", error);
                        return 10000; // fallback delay
                    }
                }
                return 10000; // fallback delay if no config found
            }
        });

        // Get the delay from the script result, with fallback
        const delayMs = configResult[0]?.result || 10000;
        console.log(`Delay from website-config: ${delayMs}ms`);

        // Wait additional time for navigation to complete after postGrab finishes
        setTimeout(async () => {
            try {
                const updatedTab = await chrome.tabs.get(tabId);
                const newUrl = updatedTab.url;
                
                if (newUrl !== initialUrl) {
                    // Ensure scripts are injected before trying to get config
                    await scriptInjector.injectScriptsSequentially(tabId);
                    
                    // Get site-specific auto-grab config from WEBSITE_CONFIGS
                    const configResult = await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: function() {
                            if (typeof findMatchingConfig === "undefined") {
                                console.error("findMatchingConfig is not available");
                                return null;
                            }
                            const config = findMatchingConfig(window.location.href);
                            return config?.autoGrab || null;
                        }
                    });
                    
                    const autoGrabConfig = configResult[0]?.result;
                    
                    if (!autoGrabConfig || !autoGrabConfig.enabled) {
                        console.log(`No auto-grab config found for ${storyInfo.storyTitle} - closing tab`);
                        chrome.tabs.remove(tabId);
                        // DEBUG: Comment out the line above to keep tabs open for auto-grab debugging
                        return;
                    }
                    
                    const defaultCount = autoGrabConfig.defaultCount;
                    const defaultDelay = autoGrabConfig.defaultDelay;
                    
                    // Start bulk grab on this tab
                    await bulkGrabManager.startBulkGrab(defaultCount, defaultDelay, tabId, storyInfo.storyId);
                    console.log(`Started bulk grab for ${storyInfo.storyTitle}: ${defaultCount} chapters, ${defaultDelay}s delay`);
                    
                    // Update story tracker with bulk grab start status
                    await scriptInjector.injectScriptsSequentially(tabId);
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: async (url, status, storyId) => {
                            if (typeof StoryTracker !== "undefined") {
                                await StoryTracker.updateLastCheckStatus(url, status, storyId);
                            }
                        },
                        args: [newUrl, `Bulk grabbing ${defaultCount} chapters...`, storyInfo.storyId]
                    });
                    
                    // Note: Don't mark as completed here - wait for bulk grab to finish
                } else {
                    // Update story tracker with end-of-story status
                    await scriptInjector.injectScriptsSequentially(tabId);
                    await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: async (url, status, storyId) => {
                            if (typeof StoryTracker !== "undefined") {
                                await StoryTracker.updateLastCheckStatus(url, status, storyId);
                            }
                        },
                        args: [initialUrl, "No next chapter found", storyInfo.storyId]
                    });
                    
                    // Notify queue manager directly since no bulk grab will run
                    if (storyInfo.storyId) {
                        queueManager.handleStoryAutoGrabComplete(storyInfo.storyId, false, "No next chapter found");
                    }
                    
                    // Close the tab since no new content
                    chrome.tabs.remove(tabId);
                    // DEBUG: Comment out the line above to keep tabs open for auto-grab debugging
                }
            } catch (error) {
                console.error(`Error checking URL change for ${storyInfo.storyTitle}:`, error);
                // Notify queue manager of error
                if (storyInfo.storyId) {
                    queueManager.handleStoryAutoGrabComplete(storyInfo.storyId, false, error.message);
                }
            }
        }, delayMs);
        
    } catch (error) {
        console.error(`Error in performAutoGrabSequence for ${storyInfo.storyTitle}:`, error);
        // Notify queue manager of error
        if (storyInfo.storyId) {
            queueManager.handleStoryAutoGrabComplete(storyInfo.storyId, false, error.message);
        }
    }
}

// Basic filtering and error checking on messages before dispatching
async function handleMessages(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background script
    if (message.target !== "background") {
        return false;
    }

    switch (message.type) {
    case "downloadAsFile":
        await downloadHandler.downloadAsFile(message.title, message.blobUrl, message.cleanup);
        break;
    case "showError":
        // You could implement a notification system here
        console.log("ERROR: " + message.message);
        break;
    case "grabContent":
        await handleGrabContent(message, sender);
        break;
    case "updateStoryTracker": {
        const tabId = await scriptInjector.getTabId(message, sender);
        
        // Check if this tab is associated with a queue story
        const storyId = queueManager.getStoryIdForTab(tabId);
        
        // Inject story tracker script and update via content script
        await scriptInjector.injectScriptsSequentially(tabId);
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: async (url, title, storyId) => {
                if (typeof StoryTracker !== "undefined") {
                    await StoryTracker.updateLastChapter(url, title, storyId);
                }
            },
            args: [message.url, message.title, storyId]
        });
        break;
    }
    case "openBackgroundTab":
        // Open URL in background tab (for Ctrl+click functionality)
        try {
            chrome.tabs.create({
                url: message.url,
                active: false
            });
            console.log("Opened background tab:", message.url);
        } catch (error) {
            console.error("Failed to open background tab:", error);
        }
        break;
    case "startBulkGrab": {
        const startTabId = await scriptInjector.getTabId(message, sender);
        await bulkGrabManager.startBulkGrab(message.pageCount, message.delaySeconds, startTabId);
        break;
    }
    case "stopGrabbing": {
        const stopTabId = await scriptInjector.getTabId(message, sender);
        
        // Update story tracker with status and show message if provided
        if (message.status && message.url) {
            // Inject story tracker script and update via content script
            await scriptInjector.injectScriptsSequentially(stopTabId);
            await chrome.scripting.executeScript({
                target: { tabId: stopTabId },
                func: async (url, status) => {
                    if (typeof StoryTracker !== "undefined") {
                        await StoryTracker.updateLastCheckStatus(url, status);
                    }
                },
                args: [message.url, message.status]
            });
            console.log("ERROR: " + message.status);
        }
        
        // Stop the grabbing process with the reason
        const reason = message.status || "Bulk grab stopped manually";
        await bulkGrabManager.stopGrabbing(stopTabId, reason);
        
        break;
    }
    case "getBulkGrabStatus":
        // Handle async response properly
        void (async () => {
            const tabId = await scriptInjector.getTabId(message, sender);
            const status = await bulkGrabManager.getBulkGrabStatus(tabId);
            sendResponse(status);
        })();
        return true; // Keep message channel open for async response
    case "clearBulkGrabStatus":
        void (async () => {
            const tabId = await scriptInjector.getTabId(message, sender);
            await bulkGrabManager.removeBulkGrabState(tabId);
        })();
        break;
    case "startAutoGrab":
        await handleAutoGrab(message);
        break;
    case "startQueueProcessing":
        try {
            const result = queueManager.startQueueProcessing(message.stories);
            sendResponse(result);
        } catch (error) {
            console.error("Error starting queue processing:", error);
            sendResponse({ error: error.message });
        }
        break;
    case "addToQueue":
        try {
            const result = queueManager.addToQueue(message.stories);
            sendResponse(result);
        } catch (error) {
            console.error("Error adding to queue:", error);
            sendResponse({ error: error.message });
        }
        break;
    case "pauseQueue":
        queueManager.pauseQueue();
        break;
    case "resumeQueue":
        queueManager.resumeQueue();
        break;
    case "cancelQueue":
        queueManager.cancelQueue();
        break;
    case "getQueueStatus":
        sendResponse(queueManager.getQueueStatus());
        return true; // Keep message channel open for async response
    case "clearCompletedQueue":
        queueManager.clearCompletedQueue();
        break;
    default:
        console.warn(`Unexpected message type received: '${message.type}'.`);
    }
    return false;
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "grab_content") {
        await handleGrabContent({}, {});
    }
});

// Register the main message listener
chrome.runtime.onMessage.addListener(handleMessages);

// Listen for alarm events (bulk grab scheduling)
chrome.alarms.onAlarm.addListener(bulkGrabManager.handleAlarm.bind(bulkGrabManager));

// Clean up bulk grab state when tabs are closed
chrome.tabs.onRemoved.addListener(bulkGrabManager.cleanupTab.bind(bulkGrabManager));


// Main background script - coordinates all extension functionality
import { ScriptInjector } from "./modules/script-injector.js";
import { BulkGrabManager } from "./modules/bulk-grab-manager.js";
import { DownloadHandler } from "./modules/download-handler.js";
import { QueueManager } from "./modules/queue-manager.js";
import { StoryManager } from "./modules/story-manager.js";
import { StoryUpdateChecker } from "./modules/story-update-checker.js";
import "./website-configs.js";
// WEBSITE_CONFIGS and related functions are available via globalThis

// Initialize modules
const downloadHandler = new DownloadHandler();
const scriptInjector = new ScriptInjector();

// Helper function to show notification on active tab
async function showNotificationOnActiveTab(message, type = "success") {
    try {
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && !activeTab.url.startsWith("chrome-extension://")) {
            await chrome.scripting.executeScript({
                target: { tabId: activeTab.id },
                func: (msg, notificationType) => {
                    const notification = document.createElement("div");
                    notification.textContent = msg;
                    notification.className = `notification${notificationType === "error" ? " error" : ""}`;
                    
                    document.body.appendChild(notification);
                    setTimeout(() => notification.remove(), 3000);
                },
                args: [message, type]
            });
        }
    } catch (error) {
        console.error("Failed to show notification:", error);
    }
}

// Handle grab content (for direct grabs)
async function handleGrabContent(message, sender) {
    const tabId = await scriptInjector.getTabId(message, sender);
    if (tabId) {
        // Verify the tab still exists before proceeding
        try {
            await chrome.tabs.get(tabId);
        } catch (error) {
            console.log("Tab", tabId, "no longer exists, skipping grab");
            return;
        }

        if (!message?.ignoreDuplicateCheck && await StoryManager.isDuplicateChapter(tabId)) {
            // Don't inject scripts for duplicate - show notification instead
            await showNotificationOnActiveTab("Duplicate chapter", "error");
            return;
        }
        
        try {
            // Proceed with normal grab
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
        // Verify the tab still exists before proceeding
        try {
            await chrome.tabs.get(tabId);
        } catch (error) {
            console.log("Tab", tabId, "no longer exists, skipping bulk grab");
            // Notify bulk grab manager that this tab is gone
            if (bulkGrabManager) {
                await bulkGrabManager.cleanupTab(tabId);
            }
            return;
        }

        if (!message?.ignoreDuplicateCheck && await StoryManager.isDuplicateChapter(tabId)) {
            // Get status to check if from tracker
            const status = StoryManager.openStoryStatuses.get(tabId);
            
            // Check if this is from story tracker (ALL story tracker grabs are bulk)
            if (status?.isFromTracker && status?.storyId) {
                // Notify queue manager so it can continue processing
                queueManager.handleBulkGrabComplete(
                    tabId, 
                    false,
                    "Duplicate chapter", 
                    false, // not an error, just a duplicate
                    0,
                    false
                );
                
                // Update story tracker status
                await StoryManager.updateLastCheckStatus(
                    status.url, 
                    "Duplicate chapter", 
                    status.storyId
                );
            } else {
                // Regular manual bulk grab - just show notification
                await showNotificationOnActiveTab(
                    "Cannot start bulk grab from duplicate",
                    "error"
                );
            }
            return;
        }
        
        try {
            // Proceed with normal bulk grab
            await scriptInjector.injectGrabbingScriptsAndExecute(tabId, true);
        } catch (error) {
            // Check if it's a frame removal error (tab was closed)
            if (error.message && error.message.includes("Frame with ID")) {
                console.log("Tab was closed during bulk grab, likely the last chapter completed");
                // Notify bulk grab manager to handle cleanup
                if (bulkGrabManager) {
                    await bulkGrabManager.cleanupTab(tabId);
                }
            } else {
                console.error("Error during bulk grab content:", error);
            }
        }
    }
}

// Create completion callback for bulk grab manager
const handleBulkGrabComplete = (tabId, success, message, isError = false, chaptersDownloaded = 0, isManualStop = false) => {
    queueManager.handleBulkGrabComplete(tabId, success, message, isError, chaptersDownloaded, isManualStop);
};

const bulkGrabManager = new BulkGrabManager(handleBulkGrabContent, handleBulkGrabComplete, scriptInjector);
const queueManager = new QueueManager(handleAutoGrab);
const storyUpdateChecker = new StoryUpdateChecker(queueManager, StoryManager);

// Handle bulk grab for individual stories
async function handleAutoGrab(message) {
    try {
        // Get auto-nav config to check if tab should be active
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

        // Cache the story info immediately for tracker-opened tabs
        StoryManager.openStoryStatuses.set(tab.id, {
            url: message.lastChapterUrl,
            storyId: message.storyId,
            story: message, // Full story object from tracker
            isFromTracker: true,
            checkedAt: Date.now()
        });

        // Register tab with queue manager if story has an ID
        if (message.storyId) {
            queueManager.registerStoryTab(message.storyId, tab.id);
        }
        
        // Wait for tab to load, then start the auto-nav and grabbing process
        chrome.tabs.onUpdated.addListener(function autoGrabListener(tabId, changeInfo) {
            if (tabId === tab.id && changeInfo.status === "complete") {
                // Remove this listener
                chrome.tabs.onUpdated.removeListener(autoGrabListener);
                
                // Start the auto-nav and grabbing process for this tab
                setTimeout(() => {
                    performAutoGrabSequence(tab.id, message);
                }, 2000); // Give page time to fully load
            }
        });
        
    } catch (error) {
        console.error(`Error in handleAutoGrab for ${message.storyTitle}:`, error);
    }
}

// Get storyId from tab - checks both StoryManager and QueueManager
async function getStoryIdFromTab(tabId) {
    if (!tabId) return null;
    
    try {
        // First check StoryManager's open story status
        const status = await StoryManager.getOpenStoryStatus(tabId);
        if (status.storyId) {
            return status.storyId;
        }
        
        // If no storyId in status, check if this tab is associated with a queue story
        const queueStoryId = queueManager.getStoryIdForTab(tabId);
        if (queueStoryId) {
            return queueStoryId;
        }
        
        return null;
    } catch (error) {
        // Tab might not exist anymore
        console.log("Could not get storyId for tab:", error.message);
        return null;
    }
}

// Perform the auto-nav and grabbing sequence: postGrab -> check URL change -> start bulk grab
async function performAutoGrabSequence(tabId, storyInfo) {
    try {
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
                if (config && config.postGrab) {
                    // Resolve function references
                    const resolvedConfig = resolveConfigFunctions(config, { 
                        grabbers: window, 
                        GrabActions: window.GrabActions 
                    });
                    
                    if (typeof resolvedConfig.postGrab === "function") {
                        try {
                            await resolvedConfig.postGrab();

                            // Return delay from website-config
                            const delay = config.autoNav?.defaultDelay || 10; // fallback to 10 seconds if not found
                            return delay * 1000; // convert to milliseconds
                        } catch (error) {
                            console.error("Error in postGrab action:", error);
                            return 10000; // fallback delay
                        }
                    }
                }
                return 10000; // fallback delay if no config found
            }
        });

        // Get the delay from the script result, with fallback
        const delayMs = configResult[0]?.result || 10000;

        // Wait additional time for navigation to complete after postGrab finishes
        setTimeout(async () => {
            try {
                const updatedTab = await chrome.tabs.get(tabId);
                const newUrl = updatedTab.url;
                
                if (newUrl !== initialUrl) {
                    // Ensure scripts are injected before trying to get config
                    await scriptInjector.injectScriptsSequentially(tabId);
                    
                    // Get site-specific auto-nav config from WEBSITE_CONFIGS
                    const configResult = await chrome.scripting.executeScript({
                        target: { tabId: tabId },
                        func: function() {
                            if (typeof findMatchingConfig === "undefined") {
                                console.error("findMatchingConfig is not available");
                                return null;
                            }
                            const config = findMatchingConfig(window.location.href);
                            return config?.autoNav || null;
                        }
                    });
                    
                    const autoNavConfig = configResult[0]?.result;
                    
                    if (!autoNavConfig || !autoNavConfig.enabled) {
                        await chrome.tabs.remove(tabId);
                        return;
                    }
                    
                    const defaultCount = autoNavConfig.defaultCount;
                    const defaultDelay = autoNavConfig.defaultDelay;
                    
                    // Start bulk grab on this tab
                    await bulkGrabManager.startBulkGrab(defaultCount, defaultDelay, tabId, storyInfo.storyId);
                    
                    // Update story tracker with bulk grab start status
                    await StoryManager.updateLastCheckStatus(newUrl, `Bulk grabbing ${defaultCount} chapters...`, storyInfo.storyId);
                    
                    // Note: Don't mark as completed here - wait for bulk grab to finish
                } else {
                    // Update story tracker with end-of-story status
                    await StoryManager.updateLastCheckStatus(initialUrl, "No next chapter found", storyInfo.storyId);
                    
                    // Notify queue manager directly since no bulk grab will run
                    if (storyInfo.storyId) {
                        queueManager.handleStoryAutoGrabComplete(storyInfo.storyId, false, "No next chapter found");
                    }
                    
                    // Close the tab since no new content
                    await chrome.tabs.remove(tabId);  // DEBUG: Commented out for testing
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

// Handle WebToEpub parser injection requests
async function handleInjectWebToEpubParser(message, sender) {
    try {
        const tabId = await scriptInjector.getTabId(message, sender);
        if (!tabId) {
            return { success: false, error: "No tab ID available for parser injection" };
        }
        
        // 1. Inject WebToEpub dependencies (util.js + parser-adapter.js)
        await scriptInjector.injectWebToEpubDependencies(tabId);
        
        // 2. Inject the specific WebToEpub parser
        await scriptInjector.injectWebToEpubParser(tabId, message.parserInfo.file);
        
        return { success: true };
        
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// Basic filtering and error checking on messages before dispatching
async function handleMessages(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background script
    if (message.target !== "background") {
        return false;
    }

    switch (message.type) {
        case "processAndDownload": {
            const result = await downloadHandler.processAndDownload(message.data);
            const tabId = await scriptInjector.getTabId(message, sender);
            const storyId = await getStoryIdFromTab(tabId);
            
            // Update story tracker with the determined filename
            if (result.success && result.filename) {
                await showNotificationOnActiveTab("Content grabbed!");
                await StoryManager.updateLastChapter(message.data.url, result.filename, storyId);
            } else {
                await showNotificationOnActiveTab("Grab failed!", "error");
            }
            
            // Notify queue manager that download attempt is complete
            // This ensures tabs marked for closing will close
            queueManager.onDownloadComplete(tabId);
            break;
        }
        case "showError":
            // You could implement a notification system here
            console.log("ERROR: " + message.message);
            break;
        case "grabContent":
            await handleGrabContent(message, sender);
            break;
        case "openBackgroundTab":
            // Open URL in background tab
            try {
                await chrome.tabs.create({
                    url: message.url,
                    active: false
                });
            } catch (error) {
                console.error("Failed to open background tab:", error);
            }
            break;
        case "openTrackedStoryTab": {
            // Open a tab from story tracker with story tracking info
            try {
                const tab = await chrome.tabs.create({
                    url: message.url,
                    active: message.active !== false  // Default to active
                });
                
                // Cache the story info for this manually opened tab
                StoryManager.openStoryStatuses.set(tab.id, {
                    url: message.url,
                    storyId: message.storyId,
                    story: message.story,
                    isFromTracker: true,  // Treat manual tracker links as "from tracker"
                    checkedAt: Date.now()
                });
            } catch (error) {
                console.error("Failed to open tracked story tab:", error);
            }
            break;
        }
        case "startBulkGrab": {
            const startTabId = await scriptInjector.getTabId(message, sender);
            await bulkGrabManager.startBulkGrab(message.pageCount, message.delaySeconds, startTabId);
            break;
        }
        case "stopGrabbing": {
            // Update story tracker with status if provided
            if (message.status && message.url) {
                try {
                    await StoryManager.updateLastCheckStatus(message.url, message.status);
                } catch (error) {
                    console.warn("Could not update story tracker status:", error);
                }
            }
            
            // Now try to stop the actual grabbing process
            try {
                const stopTabId = await scriptInjector.getTabId(message, sender);
                const reason = message.status || "Bulk grab stopped manually";
                await bulkGrabManager.stopGrabbing(stopTabId, reason);
            } catch (error) {
                // Handle case where tab doesn't exist or other errors
                console.log("Could not stop grabbing - tab may be closed:", error.message);
            }
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
        case "injectWebToEpubParser":
            handleInjectWebToEpubParser(message, sender)
                .catch(error => console.error("Error in handleInjectWebToEpubParser:", error));
            break;
        case "addStoryToTracker":
            try {
                if (message.story) {
                    await StoryManager.saveStory(message.story);
                    await showNotificationOnActiveTab("Story added!", "success");
                }
            } catch (error) {
                console.error("addStoryToTracker: Error in background script:", error);
            }
            break;
        case "updateStoryCheckStatus":
            try {
                await StoryManager.updateLastCheckStatus(message.url, message.status, message.storyId);
            } catch (error) {
                console.warn("Could not update story tracker status:", error);
            }
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

// Listen for alarm events (bulk grab scheduling and story update checks)
chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === "storyUpdateCheck") {
        storyUpdateChecker.performCheck().then();
    } else {
        bulkGrabManager.handleAlarm(alarm);
    }
});

// Clean up when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
    bulkGrabManager.cleanupTab(tabId).then();
    // Clean up story status cache
    StoryManager.openStoryStatuses.delete(tabId);
    // Clean up session storage
    chrome.storage.session.remove([`duplicateTab_${tabId}`]).then();
});

// Clear cache on navigation (URL change)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo) => {
    if (changeInfo.url) {
        StoryManager.handleOpenStoryNavigation(tabId, changeInfo.url);
    }
});

// Initialize story update checker on extension startup
storyUpdateChecker.initialize().then(() => {
    console.log("Story update checker initialized");
});


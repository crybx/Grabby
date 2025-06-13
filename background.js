// Main background script - coordinates all extension functionality
import { ScriptInjector } from "./modules/script-injector.js";
import { BulkGrabManager } from "./modules/bulk-grab-manager.js";
import { DownloadHandler } from "./modules/download-handler.js";
import { StoryTrackerStorage } from "./modules/story-tracker-storage.js";

// Initialize modules
const downloadHandler = new DownloadHandler();
const scriptInjector = new ScriptInjector();

// Handle grab content
async function handleGrabContent(message, sender) {
    const tabId = await scriptInjector.getTabId(message, sender);
    if (tabId) {
        try {
            // Perform the content grab
            await scriptInjector.injectGrabbingScriptsAndExecute(tabId);
        } catch (error) {
            console.error("Error during grab content:", error);
        }
    }
}

const bulkGrabManager = new BulkGrabManager(handleGrabContent);
const storyTracker = new StoryTrackerStorage(bulkGrabManager);

// Handle auto grab for individual stories
async function handleAutoGrab(message) {
    try {
        console.log(`Starting auto-grab for story: ${message.storyTitle}`);
        
        // Open the last chapter URL in a new background tab
        const tab = await chrome.tabs.create({
            url: message.lastChapterUrl,
            active: false
        });
        
        console.log(`Opened tab ${tab.id} for ${message.storyTitle}`);
        
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
        
        // Run postGrab action to navigate to next chapter
        await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: function() {
                const config = findMatchingConfig(window.location.href);
                if (config && config.postGrab && typeof config.postGrab === "function") {
                    try {
                        config.postGrab();
                        console.log("PostGrab action executed for auto-grab");
                    } catch (error) {
                        console.error("Error in postGrab action:", error);
                    }
                }
            }
        });
        
        // Wait a bit for navigation to complete
        setTimeout(async () => {
            try {
                const updatedTab = await chrome.tabs.get(tabId);
                const newUrl = updatedTab.url;
                
                if (newUrl !== initialUrl) {
                    console.log(`URL changed for ${storyInfo.storyTitle}: ${initialUrl} -> ${newUrl}`);
                    
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
                        return;
                    }
                    
                    const defaultCount = autoGrabConfig.defaultCount;
                    const defaultDelay = autoGrabConfig.defaultDelay;
                    
                    // Start bulk grab on this tab
                    await bulkGrabManager.startBulkGrab(defaultCount, defaultDelay, tabId);
                    console.log(`Started bulk grab for ${storyInfo.storyTitle}: ${defaultCount} chapters, ${defaultDelay}s delay`);
                } else {
                    console.log(`No URL change for ${storyInfo.storyTitle} - may be at end or stuck`);
                    // Close the tab since no new content
                    chrome.tabs.remove(tabId);
                }
            } catch (error) {
                console.error(`Error checking URL change for ${storyInfo.storyTitle}:`, error);
            }
        }, 3000); // Wait 3 seconds for navigation
        
    } catch (error) {
        console.error(`Error in performAutoGrabSequence for ${storyInfo.storyTitle}:`, error);
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
        await storyTracker.updateLastChapter(message.url, message.title, tabId);
        break;
    }
    case "updateStoryTrackerStatus": {
        const tabId = await scriptInjector.getTabId(message, sender);
        await storyTracker.updateLastCheckStatus(message.url, message.status, tabId);
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
        await bulkGrabManager.stopGrabbing(stopTabId);
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


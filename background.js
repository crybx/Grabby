// Main background script - coordinates all extension functionality
import { ScriptInjector } from "./modules/script-injector.js";
import { BulkGrabManager } from "./modules/bulk-grab-manager.js";
import { DownloadHandler } from "./modules/download-handler.js";
import { StoryTrackerStorage } from "./modules/story-tracker-storage.js";

// Initialize modules
const downloadHandler = new DownloadHandler();
const scriptInjector = new ScriptInjector();
const storyTracker = new StoryTrackerStorage();

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
    case "updateStoryTracker":
        await storyTracker.updateLastChapter(message.url, message.title);
        break;
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
    case "stopBulkGrab": {
        const stopTabId = await scriptInjector.getTabId(message, sender);
        await bulkGrabManager.stopBulkGrab(stopTabId);
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


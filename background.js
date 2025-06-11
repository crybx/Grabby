// Main background script - coordinates all extension functionality
import { ScriptInjector } from "./modules/script-injector.js";
import { BulkGrabManager } from "./modules/bulk-grab-manager.js";
import { DownloadHandler } from "./modules/download-handler.js";
import { MessageRouter } from "./modules/message-router.js";

// Initialize modules
const downloadHandler = new DownloadHandler();
const scriptInjector = new ScriptInjector(downloadHandler);
const bulkGrabManager = new BulkGrabManager(scriptInjector);
const messageRouter = new MessageRouter(scriptInjector, bulkGrabManager, downloadHandler);

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "grab_content") {
        await scriptInjector.grabContent();
    }
});

// Register the main message listener
chrome.runtime.onMessage.addListener(messageRouter.handleMessages.bind(messageRouter));

// Listen for alarm events (bulk grab scheduling)
chrome.alarms.onAlarm.addListener(bulkGrabManager.handleAlarm.bind(bulkGrabManager));

// Clean up bulk grab state when tabs are closed
chrome.tabs.onRemoved.addListener(bulkGrabManager.cleanupTab.bind(bulkGrabManager));

// Service worker lifecycle events
chrome.runtime.onStartup.addListener(async () => {
    console.log("Service worker startup - session storage will be clean");
    // Session storage automatically cleans up, no need to resume anything
});

chrome.runtime.onInstalled.addListener(async () => {
    console.log("Service worker installed - session storage will be clean");
    // Session storage automatically cleans up, no need to resume anything
});
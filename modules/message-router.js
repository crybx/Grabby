// MessageRouter - Handles all extension message routing
export class MessageRouter {
    constructor(scriptInjector, bulkGrabManager, downloadHandler) {
        this.scriptInjector = scriptInjector;
        this.bulkGrabManager = bulkGrabManager;
        this.downloadHandler = downloadHandler;
    }

    // Basic filtering and error checking on messages before dispatching
    // the message to a more specific functions or message handlers.
    async handleMessages(message, sender, sendResponse) {
        // Return early if this message isn't meant for the background script
        if (message.target !== "background") {
            return false;
        }

        switch (message.type) {
        case "downloadAsFile":
            await this.downloadHandler.downloadAsFile(message.title, message.blobUrl, message.cleanup);
            break;
        case "showError":
            // You could implement a notification system here
            console.error(message.message);
            break;
        case "grabContent":
            await this.scriptInjector.grabContent(message, sender);
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
        case "startBulkGrab":
            const startTabId = await this.scriptInjector.getTabId(message, sender);
            await this.bulkGrabManager.startBulkGrab(message.pageCount, message.delaySeconds, startTabId);
            break;
        case "stopBulkGrab":
            const stopTabId = await this.scriptInjector.getTabId(message, sender);
            await this.bulkGrabManager.stopBulkGrab(stopTabId);
            break;
        case "getBulkGrabStatus":
            // Handle async response properly
            void (async () => {
                const tabId = await this.scriptInjector.getTabId(message, sender);
                const status = await this.bulkGrabManager.getBulkGrabStatus(tabId);
                sendResponse(status);
            })();
            return true; // Keep message channel open for async response
        case "clearBulkGrabStatus":
            void (async () => {
                const tabId = await this.scriptInjector.getTabId(message, sender);
                await this.bulkGrabManager.removeBulkGrabState(tabId);
            })();
            break;
        default:
            console.warn(`Unexpected message type received: '${message.type}'.`);
        }
        return false;
    }
}
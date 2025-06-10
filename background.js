// Function to inject scripts sequentially and then execute a callback function
async function injectGrabbingScriptsAndExecute(tabId) {
    const scripts = ["utils.js", "pre-grab-actions.js", "post-grab-actions.js", "grabbers.js", "grabber-core.js"];

    // First, check if GrabbyCore is already available (if so, we can skip injecting scripts)
    const coreCheckResult = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            return typeof GrabbyCore !== "undefined";
        }
    });

    const grabbyExists = coreCheckResult[0].result;

    // If GrabbyCore already exists, just run the grabbing function
    if (grabbyExists) {
        console.log("GrabbyCore already exists, skipping script injection");
        return chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: () => {
                // Use the shared core functionality
                return GrabbyCore.grabFromWebsite().then(result => {
                    if (result && result.filename && result.content) {
                        return GrabbyCore.handleContentDownload(result.filename, result.content);
                    }
                    return false;
                });
            }
        });
    }

    // Helper function to inject scripts sequentially
    async function injectScriptsSequentially(index) {
        if (index >= scripts.length) {
            // All scripts injected, now execute the main function
            return chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Use the shared core functionality
                    return GrabbyCore.grabFromWebsite().then(result => {
                        if (result && result.filename && result.content) {
                            return GrabbyCore.handleContentDownload(result.filename, result.content);
                        }
                        return false;
                    });
                }
            });
        }

        // Check if this script needs to be injected
        const scriptName = scripts[index].replace(".js", "");
        const variablesToCheck = {
            "utils": ["removeTag", "unwrapTag"], // Functions from utils.js
            "pre-grab-actions": ["PreGrabActions"], // Object from pre-grab-actions.js
            "post-grab-actions": ["PostGrabActions"], // Object from post-grab-actions.js
            "grabbers": ["grabRidi", "grabPatreon"], // Functions from grabbers.js
            "grabber-core": ["GrabbyCore"] // Object from grabber-core.js
        };

        const checkResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (vars) => {
                // For each variable to check, see if it exists in the global scope
                return vars.some(v => typeof window[v] !== "undefined" ||
                    (typeof window.GrabbyCore !== "undefined" &&
                        typeof window.GrabbyCore[v] !== "undefined"));
            },
            args: [variablesToCheck[scriptName] || []]
        });

        const scriptExists = checkResult[0].result;

        if (scriptExists) {
            console.log(`Script ${scripts[index]} appears to be already loaded, skipping`);
            // Skip to the next script
            return injectScriptsSequentially(index + 1);
        }

        // Inject the current script
        console.log(`Injecting ${scripts[index]}`);
        return chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scripts[index]]
        }).then(() => {
            // Move to the next script
            return injectScriptsSequentially(index + 1);
        }).catch(error => {
            console.error(`Failed to inject ${scripts[index]}:`, error);
            throw error;
        });
    }

    // Start the injection sequence with the first script
    return injectScriptsSequentially(0);
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "grab_content") {
        await grabContent();
    }
});

async function getTabId(message, sender) {
    let tabId = message?.tabId;

    if (!tabId && sender?.tab) {
        tabId = sender.tab.id;
    }

    if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            tabId = tab.id;
        }
    }

    if (!tabId) {
        console.error("No tab ID found for content grabbing");
        return null;
    }

    return tabId;
}

async function grabContent(message, sender) {
    let tabId = await getTabId(message, sender);
    if (tabId) {
        try {
            // Get tab info to check if it's a file URL
            const tab = await chrome.tabs.get(tabId);
            
            // Inject scripts and execute grabbing function
            await injectGrabbingScriptsAndExecute(tabId);
        } catch (error) {
            console.error("Error during script injection or execution:", error);
            // If it's a file URL and scripting fails, we might need a different approach
            if (error.message && error.message.includes("Cannot access")) {
                console.error("Cannot access file:// URL. Make sure 'Allow access to file URLs' is enabled for this extension.");
            }
        }
    }
}

// Basic filtering and error checking on messages before dispatching
// the message to a more specific functions or message handlers.
async function handleMessages(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background script
    if (message.target !== "background") {
        return false;
    }

    switch (message.type) {
    case "downloadAsFile":
        await downloadAsFile(message.title, message.blobUrl, message.cleanup);
        break;
    case "showError":
        // You could implement a notification system here
        console.error(message.message);
        break;
    case "grabContent":
        await grabContent(message, sender);
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
        await startBulkGrab(message.pageCount, message.delaySeconds, sender);
        break;
    case "stopBulkGrab":
        await stopBulkGrab(sender);
        break;
    case "getBulkGrabStatus":
        // Handle async response properly
        void (async () => {
            const tabId = await getTabId(message, sender);
            const status = await getBulkGrabStatus(tabId);
            sendResponse(status);
        })();
        return true; // Keep message channel open for async response
    case "clearBulkGrabStatus":
        void (async () => {
            const tabId = await getTabId(message, sender);
            await removeBulkGrabState(tabId);
        })();
        break;
    default:
        console.warn(`Unexpected message type received: '${message.type}'.`);
    }
    return false;
}

// Register the message listener
chrome.runtime.onMessage.addListener(handleMessages);

async function downloadAsFile(title, blobUrl, cleanup) {
    let fileName = title;
    // # and , are not illegal, but they are annoying
    let illegalWindowsFileNameRegex = /[<>:"#!/\\|?*]/g;
    fileName = fileName.replace(illegalWindowsFileNameRegex, "");

    // remove 'Ridi' from the filename
    fileName = fileName.replace(" - Ridi", "");
    // remove any other whitespace
    fileName = fileName.replace(/\s/g, "_");
    // replace . with _ in the filename
    fileName = fileName.replace(/\./g, "_");
    // replace comma with nothing
    fileName = fileName.split(",").join("");
    fileName = fileName + ".html";
    console.log(fileName);

    let options = {
        url: blobUrl,
        filename: fileName,
        saveAs: false
    };

    const downloadId = await chrome.downloads.download(options, cleanup);
    console.log(`Download started with ID ${downloadId}`);
}

// =============================================================================
// BULK GRABBING FUNCTIONALITY - Using alarms for persistence across service worker restarts
// =============================================================================

// Helper functions for tab-specific storage and alarms
function getBulkGrabAlarmName(tabId) {
    return `bulkGrabNextPage_${tabId}`;
}

function getBulkGrabStorageKey(tabId) {
    return `bulkGrabState_${tabId}`;
}

// Send status update to popup
function sendStatusToPopup(status, progress) {
    chrome.runtime.sendMessage({
        target: "popup",
        type: "bulkGrabStatus",
        status: status,
        progress: progress
    }).catch(() => {
        // Popup might be closed, that's ok
    });
}

// Send completion message to popup
async function sendCompletionToPopup(tabId) {
    if (tabId) {
        const state = await loadBulkGrabState(tabId);
        if (state) {
            // Save completion status
            state.isRunning = false;
            state.lastStatus = "Completed!";
            state.lastProgress = 100;
            await saveBulkGrabState(tabId, state);
        }
    }
    
    chrome.runtime.sendMessage({
        target: "popup",
        type: "bulkGrabComplete"
    }).catch(() => {
        // Popup might be closed, that's ok
    });
}

// Send stopped message to popup
async function sendStoppedToPopup(tabId) {
    if (tabId) {
        const state = await loadBulkGrabState(tabId);
        if (state) {
            // Save stopped status
            state.isRunning = false;
            state.lastStatus = "Stopped";
            state.lastProgress = state.currentPage && state.totalPages ? 
                Math.round((state.currentPage / state.totalPages) * 100) : 0;
            await saveBulkGrabState(tabId, state);
        }
    }
    
    chrome.runtime.sendMessage({
        target: "popup",
        type: "bulkGrabStopped"
    }).catch(() => {
        // Popup might be closed, that's ok
    });
}

// Get current bulk grab status from storage for a specific tab
async function getBulkGrabStatus(tabId) {
    if (!tabId) return {
        isRunning: false,
        status: "Ready", 
        progress: 0
    };
    
    const storageKey = getBulkGrabStorageKey(tabId);
    const result = await chrome.storage.session.get(storageKey);
    const state = result[storageKey];
    
    if (!state) {
        return {
            isRunning: false,
            status: "Ready",
            progress: 0
        };
    }
    
    // Return state information even if not currently running
    if (!state.isRunning) {
        return {
            isRunning: false,
            status: state.lastStatus || "Ready",
            progress: state.lastProgress || 0,
            pageCount: state.totalPages,
            delaySeconds: state.delaySeconds
        };
    }
    
    return {
        isRunning: state.isRunning,
        status: `Grabbing page ${state.currentPage} of ${state.totalPages}`,
        progress: state.totalPages > 0 ? 
            Math.round((state.currentPage / state.totalPages) * 100) : 
            0,
        pageCount: state.totalPages,
        delaySeconds: state.delaySeconds
    };
}

// Save bulk grab state to storage for a specific tab
async function saveBulkGrabState(tabId, state) {
    if (!tabId) return;
    const storageKey = getBulkGrabStorageKey(tabId);
    await chrome.storage.session.set({ [storageKey]: state });
}

// Load bulk grab state from storage for a specific tab
async function loadBulkGrabState(tabId) {
    if (!tabId) return null;
    const storageKey = getBulkGrabStorageKey(tabId);
    const result = await chrome.storage.session.get(storageKey);
    return result[storageKey] || null;
}

// Clear bulk grab state (but preserve last status for popup display)
async function clearBulkGrabState(tabId) {
    if (!tabId) return;
    
    const state = await loadBulkGrabState(tabId);
    if (state) {
        // Keep the last status info but clear running state
        const preservedState = {
            isRunning: false,
            lastStatus: state.lastStatus || (state.isRunning ? "Stopped" : "Ready"),
            lastProgress: state.lastProgress || (state.currentPage && state.totalPages ? 
                Math.round((state.currentPage / state.totalPages) * 100) : 0),
            totalPages: state.totalPages,
            delaySeconds: state.delaySeconds
        };
        await saveBulkGrabState(tabId, preservedState);
    }
    chrome.alarms.clear(getBulkGrabAlarmName(tabId));
}

// Completely remove bulk grab state for a tab (used when tab closes)
async function removeBulkGrabState(tabId) {
    if (!tabId) return;
    
    const storageKey = getBulkGrabStorageKey(tabId);
    await chrome.storage.session.remove(storageKey);
    chrome.alarms.clear(getBulkGrabAlarmName(tabId));
}

// Start bulk grab process
async function startBulkGrab(pageCount, delaySeconds, sender) {
    const tabId = await getTabId(null, sender);
    if (!tabId) {
        console.error("No tab ID available for bulk grab");
        return;
    }
    
    // Check if this tab already has a running bulk grab
    const existingState = await loadBulkGrabState(tabId);
    if (existingState && existingState.isRunning) {
        console.log(`Bulk grab already running for tab ${tabId}`);
        return;
    }
    
    // Initialize state for this tab
    const state = {
        isRunning: true,
        shouldStop: false,
        currentPage: 0,
        totalPages: pageCount,
        delaySeconds: delaySeconds,
        startTime: Date.now(),
        tabId: tabId
    };
    
    await saveBulkGrabState(tabId, state);
    
    console.log(`Starting bulk grab for tab ${tabId}: ${pageCount} pages with ${delaySeconds}s delay`);
    sendStatusToPopup("Starting bulk grab...", 0);
    
    // Start the first grab immediately
    performNextBulkGrab(tabId);
}

// Stop bulk grab process for current tab
async function stopBulkGrab(sender) {
    const tabId = await getTabId(null, sender);
    if (!tabId) {
        console.error("No tab ID available for stopping bulk grab");
        return;
    }
    
    const state = await loadBulkGrabState(tabId);
    if (!state || !state.isRunning) {
        return;
    }
    
    console.log(`Stopping bulk grab for tab ${tabId}`);
    await clearBulkGrabState(tabId);
    sendStoppedToPopup(tabId);
}

// Perform the next bulk grab - called by alarm or directly
async function performNextBulkGrab(tabId) {
    if (!tabId) {
        console.error("No tab ID provided for performNextBulkGrab");
        return;
    }
    
    const state = await loadBulkGrabState(tabId);
    
    if (!state || !state.isRunning || state.shouldStop) {
        console.log(`Bulk grab stopped or not running for tab ${tabId}`);
        await clearBulkGrabState(tabId);
        return;
    }
    
    // Check if we're done
    if (state.currentPage >= state.totalPages) {
        const duration = Math.round((Date.now() - state.startTime) / 1000);
        console.log(`Bulk grab completed for tab ${tabId}: ${state.totalPages} pages in ${duration}s`);
        sendCompletionToPopup(tabId);
        await clearBulkGrabState(tabId);
        return;
    }
    
    state.currentPage++;
    const progress = Math.round((state.currentPage / state.totalPages) * 100);
    
    console.log(`Bulk grab tab ${tabId}: page ${state.currentPage} of ${state.totalPages}`);
    sendStatusToPopup(`Grabbing page ${state.currentPage} of ${state.totalPages}`, progress);
    
    // Save updated state
    await saveBulkGrabState(tabId, state);
    
    try {
        // Perform the grab
        await grabContent(null, { tab: { id: state.tabId } });
        
        // Schedule next grab if not the last page
        if (state.currentPage < state.totalPages) {
            sendStatusToPopup(`Waiting ${state.delaySeconds}s before next grab...`, progress);
            
            // Use Chrome alarms API for delays >= 60s, setTimeout with keepalive for shorter delays
            if (state.delaySeconds >= 60) {
                chrome.alarms.create(getBulkGrabAlarmName(tabId), { 
                    delayInMinutes: state.delaySeconds / 60 
                });
            } else {
                // For delays < 60s, use setTimeout with keepalive to prevent service worker timeout
                keepAliveAndSchedule(tabId, state.delaySeconds);
            }
        } else {
            // This was the last page, finish up
            setTimeout(() => performNextBulkGrab(tabId), 100);
        }
        
    } catch (error) {
        console.error(`Error during bulk grab page ${state.currentPage} for tab ${tabId}:`, error);
        sendStatusToPopup(`Error on page ${state.currentPage}, continuing...`, progress);
        
        // Continue to next page even after error
        if (state.currentPage < state.totalPages) {
            if (state.delaySeconds >= 60) {
                chrome.alarms.create(getBulkGrabAlarmName(tabId), { 
                    delayInMinutes: state.delaySeconds / 60 
                });
            } else {
                keepAliveAndSchedule(tabId, state.delaySeconds);
            }
        } else {
            setTimeout(() => performNextBulkGrab(tabId), 100);
        }
    }
}

// Keep service worker alive during short delays by performing periodic activities
function keepAliveAndSchedule(tabId, delaySeconds) {
    const startTime = Date.now();
    const endTime = startTime + (delaySeconds * 1000);
    
    function keepAlive() {
        const now = Date.now();
        
        // Check if delay period is over
        if (now >= endTime) {
            performNextBulkGrab(tabId);
            return;
        }
        
        // Keep service worker alive with storage activity
        chrome.storage.session.set({ 
            [`bulkGrabKeepalive_${tabId}`]: now 
        });
        
        // Schedule next keepalive in 20 seconds (well under the 30s timeout)
        const remainingTime = endTime - now;
        const nextInterval = Math.min(20000, remainingTime);
        
        setTimeout(keepAlive, nextInterval);
    }
    
    // Start the keepalive loop
    setTimeout(keepAlive, 100);
}

// Listen for alarm events
chrome.alarms.onAlarm.addListener((alarm) => {
    // Check if this is a bulk grab alarm (format: bulkGrabNextPage_<tabId>)
    if (alarm.name.startsWith("bulkGrabNextPage_")) {
        const tabId = parseInt(alarm.name.split("_")[1]);
        console.log(`Bulk grab alarm triggered for tab ${tabId}`);
        performNextBulkGrab(tabId);
    }
});

// Restore bulk grab states on service worker startup
// Note: Session storage is cleared on browser restart, so this mainly helps with service worker restarts
chrome.runtime.onStartup.addListener(async () => {
    console.log("Service worker startup - checking for running bulk grabs");
    // Session storage will be empty on full browser restart, which is what we want
});

// Also check on service worker install/restart  
chrome.runtime.onInstalled.addListener(async () => {
    console.log("Service worker installed - session storage will be clean");
    // Session storage automatically cleans up, no need to resume anything
});

// Clean up bulk grab state when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
    console.log(`Tab ${tabId} closed, cleaning up bulk grab state`);
    await removeBulkGrabState(tabId);
});

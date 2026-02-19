// BulkGrabManager - Handles all bulk grabbing operations
export class BulkGrabManager {
    constructor(grabContentCallback, completionCallback = null, scriptInjector = null, statusUpdateCallback = null) {
        this.grabContentCallback = grabContentCallback;
        this.completionCallback = completionCallback;
        this.scriptInjector = scriptInjector;
        this.statusUpdateCallback = statusUpdateCallback;
    }

    // Helper functions for tab-specific storage and alarms
    getBulkGrabAlarmName(tabId) {
        return `bulkGrabNextPage_${tabId}`;
    }

    getBulkGrabStorageKey(tabId) {
        return `bulkGrabState_${tabId}`;
    }

    // Send status update to popup
    sendStatusToPopup(status, progress) {
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
    async sendCompletionToPopup(tabId) {
        if (tabId) {
            const state = await this.loadBulkGrabState(tabId);
            if (state) {
                // Save completion status
                state.isRunning = false;
                state.lastStatus = "Completed!";
                state.lastProgress = 100;
                await this.saveBulkGrabState(tabId, state);
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
    async sendStoppedToPopup(tabId) {
        if (tabId) {
            const state = await this.loadBulkGrabState(tabId);
            if (state) {
                // Save stopped status
                state.isRunning = false;
                state.lastStatus = "Stopped";
                state.lastProgress = state.currentPage && state.totalPages ? 
                    Math.round((state.currentPage / state.totalPages) * 100) : 0;
                await this.saveBulkGrabState(tabId, state);
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
    async getBulkGrabStatus(tabId) {
        if (!tabId) return {
            isRunning: false,
            status: "Ready", 
            progress: 0
        };
        
        const storageKey = this.getBulkGrabStorageKey(tabId);
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
    async saveBulkGrabState(tabId, state) {
        if (!tabId) return;
        const storageKey = this.getBulkGrabStorageKey(tabId);
        await chrome.storage.session.set({ [storageKey]: state });
    }

    // Load bulk grab state from storage for a specific tab
    async loadBulkGrabState(tabId) {
        if (!tabId) return null;
        const storageKey = this.getBulkGrabStorageKey(tabId);
        const result = await chrome.storage.session.get(storageKey);
        return result[storageKey] || null;
    }

    // Clear bulk grab state (but preserve last status for popup display)
    async clearBulkGrabState(tabId) {
        if (!tabId) return;
        
        const state = await this.loadBulkGrabState(tabId);
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
            await this.saveBulkGrabState(tabId, preservedState);
        }
        await chrome.alarms.clear(this.getBulkGrabAlarmName(tabId));
    }

    // Completely remove bulk grab state for a tab (used when tab closes)
    async removeBulkGrabState(tabId) {
        if (!tabId) return;
        
        const storageKey = this.getBulkGrabStorageKey(tabId);
        await chrome.storage.session.remove(storageKey);
        await chrome.alarms.clear(this.getBulkGrabAlarmName(tabId));
    }

    // Start bulk grab process
    async startBulkGrab(pageCount, delaySeconds, tabId, storyId = null) {
        if (!tabId) {
            console.error("No tab ID available for bulk grab");
            return;
        }
        
        // Check if this tab already has a running bulk grab
        const existingState = await this.loadBulkGrabState(tabId);
        if (existingState && existingState.isRunning) {
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
            tabId: tabId,
            storyId: storyId
        };
        
        await this.saveBulkGrabState(tabId, state);

        this.sendStatusToPopup("Starting bulk grab...", 0);
        
        // Start the first grab immediately
        void this.performNextBulkGrab(tabId);
    }

    // Stop bulk grab process for current tab
    async stopGrabbing(tabId, reason = "Bulk grab stopped manually") {
        if (!tabId) {
            console.error("No tab ID available for stopping bulk grab");
            return;
        }
        
        const state = await this.loadBulkGrabState(tabId);
        if (!state || !state.isRunning) {
            return;
        }
        
        await this.clearBulkGrabState(tabId);
        await this.sendStoppedToPopup(tabId);
        
        // Determine success based on chapters downloaded, not why it stopped
        // currentPage tracks attempts, but downloads are currentPage - 1 (since last attempt was aborted)
        const chaptersDownloaded = Math.max(0, (state.currentPage || 0) - 1);
        const isError = reason.toLowerCase().includes("error");
        const isManualStop = reason.toLowerCase().includes("manually");
        
        // Notify completion callback if available
        if (this.completionCallback) {
            this.completionCallback(tabId, false, reason, isError, chaptersDownloaded, isManualStop);
        }
    }

    // Perform the next bulk grab - called by alarm or directly
    async performNextBulkGrab(tabId) {
        if (!tabId) {
            console.error("No tab ID provided for performNextBulkGrab");
            return;
        }
        
        const state = await this.loadBulkGrabState(tabId);
        
        if (!state || !state.isRunning || state.shouldStop) {
            await this.clearBulkGrabState(tabId);
            return;
        }
        
        // Check if we're done
        if (state.currentPage >= state.totalPages) {
            const duration = Math.round((Date.now() - state.startTime) / 1000);
            
            // Update story tracker with successful completion status
            // Try to get the current URL from the tab if it exists
            let currentUrl = null;
            try {
                const tab = await chrome.tabs.get(tabId).catch(() => null);
                if (tab && tab.url) {
                    currentUrl = tab.url;
                }
            } catch (error) {
                // Tab doesn't exist, that's ok
            }

            // Update story tracker with completion status
            if (this.statusUpdateCallback && (state.storyId || currentUrl)) {
                this.statusUpdateCallback(currentUrl, `Completed ${state.totalPages} chapters in ${duration}s`, state.storyId);
            }
            
            await this.sendCompletionToPopup(tabId);
            await this.clearBulkGrabState(tabId);
            
            // Notify completion callback if available
            if (this.completionCallback) {
                // For completed runs, all pages were processed so downloads = currentPage
                this.completionCallback(tabId, true, `Completed ${state.totalPages} pages in ${duration}s`, false, state.currentPage, false);
            }
            return;
        }
        
        const attemptNumber = state.currentPage + 1;
        const progress = Math.round((attemptNumber / state.totalPages) * 100);
        
        this.sendStatusToPopup(`Grabbing page ${attemptNumber} of ${state.totalPages}`, progress);
        
        try {
            // Check if tab still exists before attempting grab
            try {
                await chrome.tabs.get(state.tabId);
            } catch (tabError) {
                console.log(`Tab ${state.tabId} no longer exists, stopping bulk grab`);
                await this.sendCompletionToPopup(tabId);
                await this.clearBulkGrabState(tabId);
                if (this.completionCallback) {
                    this.completionCallback(tabId, false, "Tab closed", true, state.currentPage, false);
                }
                return;
            }
            
            // Perform the grab
            await this.grabContentCallback(null, { tab: { id: state.tabId } });
            
            // Increment currentPage after successful grab
            state.currentPage++;
            
            // Save updated state
            await this.saveBulkGrabState(tabId, state);
            
            // Schedule next grab if not the last page
            if (state.currentPage < state.totalPages) {
                this.sendStatusToPopup(`Waiting ${state.delaySeconds}s (page ${state.currentPage} of ${state.totalPages})`, progress);
                
                // Use Chrome alarms API for delays >= 60s, setTimeout with keepalive for shorter delays
                if (state.delaySeconds >= 60) {
                    chrome.alarms.create(this.getBulkGrabAlarmName(tabId), { 
                        delayInMinutes: state.delaySeconds / 60 
                    });
                } else {
                    // For delays < 60s, use setTimeout with keepalive to prevent service worker timeout
                    this.keepAliveAndSchedule(tabId, state.delaySeconds);
                }
            } else {
                // This was the last page, finish up
                setTimeout(() => this.performNextBulkGrab(tabId), 100);
            }
            
        } catch (error) {
            console.error(`Error during bulk grab page ${attemptNumber} for tab ${tabId}:`, error);
            this.sendStatusToPopup(`Error on page ${attemptNumber}, continuing...`, progress);
            
            // Increment currentPage but NOT downloadsCompleted for errors
            state.currentPage++;
            await this.saveBulkGrabState(tabId, state);
            
            // Continue to next page even after error
            if (state.currentPage < state.totalPages) {
                if (state.delaySeconds >= 60) {
                    chrome.alarms.create(this.getBulkGrabAlarmName(tabId), { 
                        delayInMinutes: state.delaySeconds / 60 
                    });
                } else {
                    this.keepAliveAndSchedule(tabId, state.delaySeconds);
                }
            } else {
                setTimeout(() => this.performNextBulkGrab(tabId), 100);
            }
        }
    }

    // Keep service worker alive during short delays by performing periodic activities
    keepAliveAndSchedule(tabId, delaySeconds) {
        const startTime = Date.now();
        const endTime = startTime + (delaySeconds * 1000);
        
        const keepAlive = () => {
            const now = Date.now();
            
            // Check if delay period is over
            if (now >= endTime) {
                void this.performNextBulkGrab(tabId);
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
        };
        
        // Start the keepalive loop
        setTimeout(keepAlive, 100);
    }

    // Handle Chrome alarm events
    handleAlarm(alarm) {
        // Check if this is a bulk grab alarm (format: bulkGrabNextPage_<tabId>)
        if (alarm.name.startsWith("bulkGrabNextPage_")) {
            const tabId = parseInt(alarm.name.split("_")[1]);
            void this.performNextBulkGrab(tabId);
        }
    }

    // Clean up bulk grab state when tabs are closed
    async cleanupTab(tabId) {
        await this.removeBulkGrabState(tabId);
    }
}
// Story Update Checker - Periodically checks for stories that need updates
export class StoryUpdateChecker {
    constructor(queueManager, storyManager) {
        this.queueManager = queueManager;
        this.storyManager = storyManager;
        this.alarmName = "storyUpdateCheck";
        this.checkIntervalMinutes = 10; // Check every 10 minutes
        this.domainSettings = {};
        this.loadSettings(); // Load initial settings
    }

    // Initialize the periodic checking
    async initialize() {
        // Clear any existing alarm
        await chrome.alarms.clear(this.alarmName);
        
        // Create recurring alarm
        await chrome.alarms.create(this.alarmName, {
            delayInMinutes: 1,                      // First check after 1 minute
            periodInMinutes: this.checkIntervalMinutes  // Then every 10 minutes
        });
        
        console.log(`Story update checker initialized - checking every ${this.checkIntervalMinutes} minutes`);
    }

    // Stop the periodic checking
    async stop() {
        await chrome.alarms.clear(this.alarmName);
        console.log("Story update checker stopped");
    }

    // Check if story tracker is the active tab in any window
    async isStoryTrackerActive() {
        try {
            // Get all active tabs (one per window)
            const activeTabs = await chrome.tabs.query({ active: true });
            
            // Check if active tab is the story tracker
            for (const tab of activeTabs) {
                if (tab.url && tab.url.includes("story-tracker.html")) {
                    return true;
                }
            }
            
            return false;
        } catch (error) {
            console.error("Error checking active tab:", error);
            return false;
        }
    }

    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace("www.", "");
        } catch {
            return null;
        }
    }

    // Load settings from chrome.storage.local
    async loadSettings() {
        try {
            const result = await chrome.storage.local.get("autoQueueSettings");
            this.domainSettings = result.autoQueueSettings || {};
        } catch (error) {
            console.error("Error loading auto-queue settings:", error);
            this.domainSettings = {};
        }
    }

    // Check if a story is eligible for update
    isEligibleForUpdate(story, now) {
        // Check if story has a URL
        if (!story.lastChapterUrl) {
            return false;
        }
        
        // Check if domain has auto-queue configured
        const domain = this.extractDomain(story.lastChapterUrl);
        if (!domain || !this.domainSettings[domain]) {
            return false;
        }
        
        // Get the configured days for this domain
        const daysInterval = this.domainSettings[domain];
        const hoursInterval = daysInterval * 24;
        
        // Check last update time
        const lastChecked = story.dateLastChecked ? new Date(story.dateLastChecked).getTime() : 0;
        const hoursSinceLastCheck = (now - lastChecked) / (1000 * 60 * 60);
        
        return hoursSinceLastCheck >= hoursInterval;
    }

    // Check if a story is already in the queue or being processed
    isStoryInQueue(story) {
        const queueStatus = this.queueManager.getQueueStatus();
        if (!queueStatus) {
            // No queue exists, story is not in queue
            return false;
        }
        
        // Check if story is currently being processed
        const isProcessing = queueStatus.processing.some(s => s.id === story.id);
        if (isProcessing) {
            return true;
        }
        
        // Check if story is in the queue
        const isQueued = queueStatus.queue.some(s => s.id === story.id);
        if (isQueued) {
            return true;
        }
        
        // Only check completed if queue is still active (to avoid re-queueing in same session)
        if (queueStatus.isActive) {
            const isCompleted = queueStatus.completed.some(s => s.id === story.id);
            if (isCompleted) {
                return true;
            }
        }
        
        return false;
    }

    // Perform the periodic check
    async performCheck() {
        try {
            // Load latest settings
            await this.loadSettings();
            
            // Check if story tracker is the active tab
            const isTrackerActive = await this.isStoryTrackerActive();
            if (!isTrackerActive) {
                // Skip this check - user is actively using the browser
                return;
            }
            
            // Get tracked stories through StoryManager
            const trackedStories = await this.storyManager.getAllStories();
            
            if (trackedStories.length === 0) {
                return;
            }
            
            const now = Date.now();
            const eligibleStories = [];
            
            // Find stories that meet all criteria
            for (const story of trackedStories) {
                // Skip if story is already in queue
                if (this.isStoryInQueue(story)) {
                    continue;
                }
                
                // Check if eligible for update
                if (this.isEligibleForUpdate(story, now)) {
                    // Include full story object - QueueManager expects all fields
                    eligibleStories.push(story);
                }
            }
            
            if (eligibleStories.length > 0) {
                console.log(`Found ${eligibleStories.length} stories eligible for auto-update check`);
                
                // Sort by last checked date (oldest first)
                eligibleStories.sort((a, b) => {
                    const aTime = a.dateLastChecked ? new Date(a.dateLastChecked).getTime() : 0;
                    const bTime = b.dateLastChecked ? new Date(b.dateLastChecked).getTime() : 0;
                    return aTime - bTime;
                });
                
                // Add to queue
                const result = this.queueManager.addToQueue(eligibleStories);
                
                console.log(`Auto-update: Added ${result.added} stories to queue (${result.immediate} immediate, ${result.queued} queued)`);
            }
        } catch (error) {
            console.error("Error in story update check:", error);
        }
    }

    // Get current checker status
    async getStatus() {
        await this.loadSettings();
        return {
            enabled: true,
            checkInterval: this.checkIntervalMinutes,
            domainSettings: this.domainSettings
        };
    }

    // Update settings
    async updateSettings(settings) {
        if (settings.checkIntervalMinutes && settings.checkIntervalMinutes !== this.checkIntervalMinutes) {
            this.checkIntervalMinutes = settings.checkIntervalMinutes;
            await this.initialize(); // Restart with new interval
        }
        
        // Settings are now loaded from chrome.storage on demand
        await this.loadSettings();
    }
}
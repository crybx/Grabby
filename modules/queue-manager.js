// Queue Manager - Handles queued processing of story auto-grabs
export class QueueManager {
    constructor(handleAutoGrabFunction) {
        this.handleAutoGrab = handleAutoGrabFunction;
        this.queue = [];
        this.processing = new Map(); // Currently processing stories
        this.completed = new Map(); // Completed stories with results
        this.tabToStoryMap = new Map(); // Map tabId to storyId for bulk grab completion
        this.isPaused = false;
        this.isActive = false;
        this.maxConcurrent = 2; // Max stories to process simultaneously
        this.queueDelayMinutes = 0.25; // Delay between starting queued stories (15 seconds)
        this.currentQueueId = null;
        
        // Register this instance for alarm handling
        QueueManager.registerInstance(this);
    }

    // Start queue processing for multiple stories
    startQueueProcessing(stories) {
        if (this.isActive) {
            console.warn("Queue processing is already running, cancelling current queue first");
            this.cancelQueue();
        }

        this.currentQueueId = Date.now().toString();
        this.isActive = true;
        this.isPaused = false;
        this.queue = [];
        this.processing.clear();
        this.completed.clear();
        this.tabToStoryMap.clear();

        console.log(`Starting queue processing for ${stories.length} stories`);

        // Categorize stories
        const backgroundStories = [];
        const activeTabStories = [];

        for (const story of stories) {
            const needsActiveTab = this.checkIfNeedsActiveTab(story.lastChapterUrl);
            if (needsActiveTab) {
                activeTabStories.push({ ...story, needsActiveTab: true });
            } else {
                backgroundStories.push({ ...story, needsActiveTab: false });
            }
        }

        // Start immediate processing (background tab stories first, up to maxConcurrent)
        const immediateStories = backgroundStories.slice(0, this.maxConcurrent);
        const queuedStories = [
            ...backgroundStories.slice(this.maxConcurrent),
            ...activeTabStories // Active tab stories go to queue
        ];

        // Add remaining stories to queue
        this.queue = queuedStories;

        // Return response immediately
        const result = {
            queueId: this.currentQueueId,
            immediate: immediateStories.length,
            queued: queuedStories.length,
            total: stories.length
        };

        // Start immediate processing asynchronously (don't await)
        setTimeout(() => {
            void this.startImmediateProcessing(immediateStories);
        }, 0);

        // Notify UI of queue start
        this.notifyQueueUpdate();

        return result;
    }

    // Start immediate processing asynchronously
    async startImmediateProcessing(immediateStories) {
        try {
            // Start immediate stories
            for (const story of immediateStories) {
                await this.startStoryAutoGrab(story);
                await new Promise(resolve => setTimeout(resolve, 2000)); // 2s delay between immediate starts
            }

            // Start queue processing if there are queued stories
            if (this.queue.length > 0) {
                this.scheduleNextQueueProcess();
            }
        } catch (error) {
            console.error("Error in immediate processing:", error);
        }
    }

    // Check if a story needs active tab based on URL
    checkIfNeedsActiveTab(url) {
        // Simple domain matching for sites that need active tabs
        if (url.includes("storyseedling.com")) {
            return true;
        }
        // Add other sites that need active tabs here
        return false;
    }

    // Start auto-grab for a single story
    async startStoryAutoGrab(story) {
        this.processing.set(story.id, {
            ...story,
            status: 'starting',
            startTime: Date.now()
        });

        try {
            console.log(`Starting auto-grab for story: ${story.title}`);
            
            // Use existing handleAutoGrab function
            await this.handleAutoGrab({
                storyId: story.id,
                storyTitle: story.title,
                lastChapterUrl: story.lastChapterUrl
            });

            // Update status to processing
            const processingStory = this.processing.get(story.id);
            if (processingStory) {
                processingStory.status = 'processing';
                this.notifyQueueUpdate();
            }

        } catch (error) {
            console.error(`Error starting auto-grab for ${story.title}:`, error);
            this.markStoryCompleted(story.id, 'error', error.message);
        }
    }

    // Schedule next queue processing
    scheduleNextQueueProcess() {
        if (this.queue.length === 0 || this.isPaused) {
            console.log(`Not scheduling queue process: queue=${this.queue.length}, paused=${this.isPaused}`);
            return;
        }

        const alarmName = `queue-processing-${this.currentQueueId}-${Date.now()}`;
        const when = Date.now() + (this.queueDelayMinutes * 60 * 1000);
        
        chrome.alarms.create(alarmName, { when });
        const delayText = this.queueDelayMinutes < 1 
            ? `${this.queueDelayMinutes * 60} seconds`
            : `${this.queueDelayMinutes} minutes`;
        console.log(`Scheduled next queue process in ${delayText}: ${alarmName}`);
    }

    // Process next story in queue
    async processNextInQueue() {
        if (this.isPaused || this.queue.length === 0) {
            return;
        }

        // Check if we have room for more concurrent processing
        const currentProcessing = Array.from(this.processing.values())
            .filter(story => story.status === 'processing' || story.status === 'starting').length;

        if (currentProcessing >= this.maxConcurrent) {
            // Reschedule for later
            this.scheduleNextQueueProcess();
            return;
        }

        // Get next story from queue
        const nextStory = this.queue.shift();
        if (!nextStory) {
            return;
        }

        console.log(`Processing queued story: ${nextStory.title}`);
        await this.startStoryAutoGrab(nextStory);

        // Schedule next if more in queue
        if (this.queue.length > 0) {
            this.scheduleNextQueueProcess();
        }
    }

    // Mark a story as completed
    markStoryCompleted(storyId, status, message = '') {
        const processingStory = this.processing.get(storyId);
        if (processingStory) {
            this.completed.set(storyId, {
                ...processingStory,
                status,
                message,
                endTime: Date.now(),
                duration: Date.now() - processingStory.startTime
            });
            this.processing.delete(storyId);
            this.notifyQueueUpdate();

            // Check if queue is complete
            if (this.processing.size === 0 && this.queue.length === 0) {
                this.completeQueue();
            } else if (this.queue.length > 0) {
                // If there are items in queue but no processing, restart queue processing
                const currentProcessing = Array.from(this.processing.values())
                    .filter(story => story.status === 'processing' || story.status === 'starting').length;
                
                if (currentProcessing < this.maxConcurrent) {
                    console.log(`Story completed, restarting queue processing. Queue: ${this.queue.length}, Processing: ${currentProcessing}`);
                    this.scheduleNextQueueProcess();
                }
            }
        }
    }

    // Complete the queue
    completeQueue() {
        console.log('Queue processing completed');
        this.isActive = false;
        this.currentQueueId = null;
        
        // Clear any remaining alarms
        chrome.alarms.getAll((alarms) => {
            alarms.forEach(alarm => {
                if (alarm.name.startsWith('queue-processing-')) {
                    chrome.alarms.clear(alarm.name);
                }
            });
        });

        this.notifyQueueUpdate();
    }

    // Pause queue processing
    pauseQueue() {
        if (!this.isActive) return;
        
        this.isPaused = true;
        console.log('Queue processing paused');
        
        // Clear scheduled alarms
        chrome.alarms.getAll((alarms) => {
            alarms.forEach(alarm => {
                if (alarm.name.startsWith('queue-processing-')) {
                    chrome.alarms.clear(alarm.name);
                }
            });
        });

        this.notifyQueueUpdate();
    }

    // Resume queue processing
    resumeQueue() {
        if (!this.isActive || !this.isPaused) return;
        
        this.isPaused = false;
        console.log('Queue processing resumed');
        
        // Restart queue processing if needed
        if (this.queue.length > 0) {
            this.scheduleNextQueueProcess();
        }

        this.notifyQueueUpdate();
    }

    // Cancel queue processing
    cancelQueue() {
        if (!this.isActive) return;
        
        console.log('Queue processing cancelled');
        
        // Clear alarms
        chrome.alarms.getAll((alarms) => {
            alarms.forEach(alarm => {
                if (alarm.name.startsWith('queue-processing-')) {
                    chrome.alarms.clear(alarm.name);
                }
            });
        });

        // Stop all currently processing stories and mark them as cancelled
        for (const [storyId, story] of this.processing) {
            // Find the tab for this story and stop its bulk grab
            const tabId = this.getTabIdForStory(storyId);
            if (tabId) {
                console.log(`Stopping bulk grab for tab ${tabId} (story: ${story.title})`);
                // Send message to background to stop the bulk grab
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "stopGrabbing",
                    tabId: tabId,
                    status: "Queue cancelled by user",
                    url: story.lastChapterUrl
                }).catch(() => {
                    // Ignore errors if message fails
                });
            }
            
            this.completed.set(storyId, {
                ...story,
                status: 'cancelled',
                message: 'Queue cancelled by user',
                endTime: Date.now(),
                duration: Date.now() - story.startTime
            });
        }

        for (const story of this.queue) {
            this.completed.set(story.id, {
                ...story,
                status: 'cancelled',
                message: 'Queue cancelled by user',
                startTime: Date.now(),
                endTime: Date.now(),
                duration: 0
            });
        }

        this.processing.clear();
        this.queue = [];
        this.tabToStoryMap.clear();
        this.isActive = false;
        this.isPaused = false;
        this.currentQueueId = null;

        this.notifyQueueUpdate();
    }

    // Get current queue status
    getQueueStatus() {
        if (!this.isActive) {
            return null;
        }

        return {
            queueId: this.currentQueueId,
            isActive: this.isActive,
            isPaused: this.isPaused,
            processing: Array.from(this.processing.values()),
            queue: this.queue,
            completed: Array.from(this.completed.values()),
            stats: {
                total: this.processing.size + this.queue.length + this.completed.size,
                processing: this.processing.size,
                queued: this.queue.length,
                completed: this.completed.size,
                successful: Array.from(this.completed.values()).filter(s => s.status === 'success').length,
                failed: Array.from(this.completed.values()).filter(s => s.status === 'error').length,
                cancelled: Array.from(this.completed.values()).filter(s => s.status === 'cancelled').length
            }
        };
    }

    // Notify UI of queue updates
    notifyQueueUpdate() {
        const status = this.getQueueStatus();
        
        // Send message to story tracker page if it's open
        chrome.tabs.query({}, (tabs) => {
            tabs.forEach(tab => {
                if (tab.url && tab.url.includes('story-tracker.html')) {
                    chrome.tabs.sendMessage(tab.id, {
                        type: 'queueUpdate',
                        status: status
                    }).catch(() => {
                        // Ignore errors if story tracker page isn't listening
                    });
                }
            });
        });
    }

    // Handle story completion from other parts of the system
    handleStoryAutoGrabComplete(storyId, success, message = '') {
        if (this.processing.has(storyId)) {
            const status = success ? 'success' : 'error';
            this.markStoryCompleted(storyId, status, message);
        }
    }

    // Handle bulk grab completion (called by bulk grab manager)
    handleBulkGrabComplete(tabId, success, message = '') {
        const storyId = this.tabToStoryMap.get(tabId);
        if (storyId) {
            console.log(`Bulk grab completed for tab ${tabId}, story ${storyId}: ${success ? 'success' : 'failure'}`);
            this.tabToStoryMap.delete(tabId);
            this.handleStoryAutoGrabComplete(storyId, success, message);
        }
    }

    // Register tab-to-story mapping when auto-grab starts
    registerStoryTab(storyId, tabId) {
        this.tabToStoryMap.set(tabId, storyId);
        console.log(`Registered tab ${tabId} for story ${storyId}`);
    }

    // Get tab ID for a story (reverse lookup)
    getTabIdForStory(storyId) {
        for (const [tabId, mappedStoryId] of this.tabToStoryMap.entries()) {
            if (mappedStoryId === storyId) {
                return tabId;
            }
        }
        return null;
    }

    // Static methods for global alarm handling
    static currentInstance = null;
    
    static registerInstance(instance) {
        QueueManager.currentInstance = instance;
        
        // Set up global alarm listener only once
        if (!QueueManager.alarmListenerSet) {
            chrome.alarms.onAlarm.addListener((alarm) => {
                if (alarm.name.startsWith('queue-processing-') && QueueManager.currentInstance) {
                    console.log(`Processing alarm: ${alarm.name}`);
                    QueueManager.currentInstance.processNextInQueue();
                }
            });
            QueueManager.alarmListenerSet = true;
        }
    }
}

QueueManager.alarmListenerSet = false;
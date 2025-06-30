// Queue Manager - Handles queued processing of story auto-grabs
export class QueueManager {
    constructor(handleAutoGrabFunction) {
        this.handleAutoGrab = handleAutoGrabFunction;
        this.queue = [];
        this.processing = new Map(); // Currently processing stories
        this.completed = new Map(); // Completed stories with results
        this.tabToStoryMap = new Map(); // Map tabId to storyId for bulk grab completion
        this.processingByDomain = new Map(); // Track processing stories by domain
        this.activeTabDomainProcessing = null; // Track which activeTab domain is currently processing
        this.isPaused = false;
        this.isActive = false;
        this.isCompleted = false; // Track if queue has completed
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
        this.isCompleted = false;
        this.queue = [];
        this.processing.clear();
        this.completed.clear();
        this.tabToStoryMap.clear();
        this.processingByDomain.clear();
        this.activeTabDomainProcessing = null;

        console.log(`Starting queue processing for ${stories.length} stories`);

        // Categorize stories by domain and activeTab requirement
        const storiesByDomain = new Map();
        const activeTabStories = [];
        const backgroundStories = [];

        for (const story of stories) {
            const domain = this.extractDomain(story.lastChapterUrl);
            const needsActiveTab = this.checkIfNeedsActiveTab(story.lastChapterUrl);
            const storyWithMetadata = { ...story, needsActiveTab, domain };
            
            if (needsActiveTab) {
                activeTabStories.push(storyWithMetadata);
            } else {
                backgroundStories.push(storyWithMetadata);
            }
            
            if (!storiesByDomain.has(domain)) {
                storiesByDomain.set(domain, []);
            }
            storiesByDomain.get(domain).push(storyWithMetadata);
        }

        // Start immediate processing - one per domain for background, one activeTab story immediately
        const immediateStories = [];
        const queuedStories = [];
        
        // Process one background story per domain immediately
        const processedDomains = new Set();
        for (const story of backgroundStories) {
            if (!processedDomains.has(story.domain)) {
                immediateStories.push(story);
                processedDomains.add(story.domain);
            } else {
                queuedStories.push(story);
            }
        }
        
        // Process one activeTab story immediately (if any)
        if (activeTabStories.length > 0) {
            immediateStories.push(activeTabStories[0]);
            queuedStories.push(...activeTabStories.slice(1));
        }

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

    // Add stories to existing active queue
    addToQueue(stories) {
        if (!this.isActive) {
            throw new Error("No active queue to add stories to");
        }

        console.log(`Adding ${stories.length} stories to existing queue`);

        // Categorize stories by domain and activeTab requirement  
        const storiesByDomain = new Map();
        const activeTabStories = [];
        const backgroundStories = [];

        for (const story of stories) {
            const domain = this.extractDomain(story.lastChapterUrl);
            const needsActiveTab = this.checkIfNeedsActiveTab(story.lastChapterUrl);
            const storyWithMetadata = { ...story, needsActiveTab, domain };
            
            if (needsActiveTab) {
                activeTabStories.push(storyWithMetadata);
            } else {
                backgroundStories.push(storyWithMetadata);
            }

            if (!storiesByDomain.has(domain)) {
                storiesByDomain.set(domain, []);
            }
            storiesByDomain.get(domain).push(storyWithMetadata);
        }

        // Add stories to existing queue
        this.queue.push(...backgroundStories, ...activeTabStories);

        // Start processing new stories that can be processed immediately
        // (domains not currently being processed)
        const immediateStories = [];
        for (const story of backgroundStories) {
            const domainProcessing = this.processingByDomain.get(story.domain);
            if (!domainProcessing || domainProcessing.size === 0) {
                immediateStories.push(story);
                // Remove from queue since we're processing immediately
                const queueIndex = this.queue.findIndex(q => q.id === story.id);
                if (queueIndex !== -1) {
                    this.queue.splice(queueIndex, 1);
                }
            }
        }

        // Process one activeTab story immediately if none is currently processing
        if (activeTabStories.length > 0 && !this.activeTabDomainProcessing) {
            immediateStories.push(activeTabStories[0]);
            // Remove from queue since we're processing immediately
            const queueIndex = this.queue.findIndex(q => q.id === activeTabStories[0].id);
            if (queueIndex !== -1) {
                this.queue.splice(queueIndex, 1);
            }
        }

        const result = {
            queueId: this.currentQueueId,
            immediate: immediateStories.length,
            queued: this.queue.length,
            added: stories.length,
            total: this.queue.length + this.processing.size + immediateStories.length
        };

        // Start immediate processing asynchronously (don't await)
        if (immediateStories.length > 0) {
            setTimeout(() => {
                void this.startImmediateProcessing(immediateStories);
            }, 0);
        }

        // Notify UI of queue update
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

    // Extract domain from URL
    extractDomain(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname;
        } catch {
            // Fallback for malformed URLs
            const match = url.match(/https?:\/\/([^/]+)/);
            return match ? match[1] : 'unknown';
        }
    }

    // Check if a story needs active tab based on URL
    checkIfNeedsActiveTab(url) {
        let activeTabSites = ["peachtea.agency", "ridibooks.com", "storyseedling.com", "readhive.org"]
        // Simple domain matching for sites that need active tabs
        if (activeTabSites.some(site => url.includes(site))) {
            return true;
        }
        // Add other sites that need active tabs here
        return false;
    }

    // Start auto-grab for a single story
    async startStoryAutoGrab(story) {
        // Track by domain
        if (!this.processingByDomain.has(story.domain)) {
            this.processingByDomain.set(story.domain, new Set());
        }
        this.processingByDomain.get(story.domain).add(story.id);
        
        // Track activeTab domain
        if (story.needsActiveTab) {
            this.activeTabDomainProcessing = story.domain;
        }
        
        this.processing.set(story.id, {
            ...story,
            status: 'starting',
            startTime: Date.now()
        });

        try {
            console.log(`Starting auto-grab for story: ${story.title} (domain: ${story.domain}, activeTab: ${story.needsActiveTab})`);
            
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

        // Find next processable story
        let nextStoryIndex = -1;
        let nextStory = null;
        
        for (let i = 0; i < this.queue.length; i++) {
            const story = this.queue[i];
            
            // Check if this domain can process (max 1 per domain)
            const domainProcessing = this.processingByDomain.get(story.domain);
            if (domainProcessing && domainProcessing.size > 0) {
                continue; // Domain already has a story processing
            }
            
            // Check activeTab exclusivity
            if (story.needsActiveTab && this.activeTabDomainProcessing !== null) {
                continue; // Another activeTab domain is already processing
            }
            
            // Found a processable story
            nextStoryIndex = i;
            nextStory = story;
            break;
        }
        
        if (nextStory) {
            // Remove from queue
            this.queue.splice(nextStoryIndex, 1);
            
            console.log(`Processing queued story: ${nextStory.title} (domain: ${nextStory.domain})`);
            await this.startStoryAutoGrab(nextStory);
        }

        // Schedule next if more in queue
        if (this.queue.length > 0) {
            this.scheduleNextQueueProcess();
        }
    }

    // Mark a story as completed
    markStoryCompleted(storyId, status, message = '') {
        const processingStory = this.processing.get(storyId);
        if (processingStory) {
            // Remove from domain tracking
            const domain = processingStory.domain;
            if (this.processingByDomain.has(domain)) {
                this.processingByDomain.get(domain).delete(storyId);
                if (this.processingByDomain.get(domain).size === 0) {
                    this.processingByDomain.delete(domain);
                }
            }
            
            // Clear activeTab domain tracking if this was an activeTab story
            if (processingStory.needsActiveTab && this.activeTabDomainProcessing === domain) {
                this.activeTabDomainProcessing = null;
            }
            
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
                // Always try to restart queue processing when a story completes
                console.log(`Story completed, restarting queue processing. Queue: ${this.queue.length}, Processing: ${this.processing.size}`);
                
                // Check if there's an activeTab story ready to process immediately
                const hasActiveTabReady = this.queue.some(story => 
                    story.needsActiveTab && this.activeTabDomainProcessing === null
                );
                
                if (hasActiveTabReady) {
                    // Process activeTab stories immediately without delay
                    console.log("Processing activeTab story immediately");
                    setTimeout(() => this.processNextInQueue(), 100); // Small delay just to let completion finish
                } else {
                    // Normal scheduling for background stories
                    this.scheduleNextQueueProcess();
                }
            }
        }
    }

    // Complete the queue
    completeQueue() {
        console.log('Queue processing completed');
        this.isActive = false;
        this.isCompleted = true;
        
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
        this.processingByDomain.clear();
        this.activeTabDomainProcessing = null;
        this.isActive = false;
        this.isPaused = false;
        this.isCompleted = true; // Mark as completed when cancelled
        // Keep currentQueueId for summary display

        this.notifyQueueUpdate();
    }

    // Clear completed queue status (called when user closes summary)
    clearCompletedQueue() {
        if (this.isCompleted && !this.isActive) {
            this.isCompleted = false;
            this.currentQueueId = null;
            this.completed.clear();
            console.log('Cleared completed queue status');
        }
    }

    // Get current queue status
    getQueueStatus() {
        if (!this.isActive && !this.isCompleted) {
            return null;
        }

        return {
            queueId: this.currentQueueId,
            isActive: this.isActive,
            isPaused: this.isPaused,
            isCompleted: this.isCompleted,
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
                noContent: Array.from(this.completed.values()).filter(s => s.status === 'no-content').length,
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

    // Handle story completion from other parts of the system (for cases where no bulk grab runs)
    handleStoryAutoGrabComplete(storyId, success, message = '') {
        if (this.processing.has(storyId)) {
            // For auto-grab completions that don't go through bulk grab, 
            // we know 0 chapters were downloaded, so determine status based on message
            let status;
            let displayMessage = message;
            
            if (message.toLowerCase().includes('error')) {
                status = 'error';
            } else {
                // No bulk grab ran, so 0 chapters downloaded - this is a no-content case
                status = 'no-content';
                if (message.toLowerCase().includes('no next')) {
                    displayMessage = 'No new chapters found';
                } else if (message.toLowerCase().includes('premium')) {
                    displayMessage = 'Premium content reached';
                } else {
                    displayMessage = 'No content available';
                }
            }
            
            this.markStoryCompleted(storyId, status, displayMessage);
        }
    }

    // Handle bulk grab completion (called by bulk grab manager)
    handleBulkGrabComplete(tabId, success, message = '', isError = false, chaptersDownloaded = 0, isManualStop = false) {
        const storyId = this.tabToStoryMap.get(tabId);
        if (storyId) {
            console.log(`Bulk grab completed for tab ${tabId}, story ${storyId}: ${chaptersDownloaded} chapters downloaded, message: ${message}`);
            this.tabToStoryMap.delete(tabId);
            
            // Determine the appropriate status based on what actually happened
            let status;
            let displayMessage = message;
            
            if (isError) {
                status = 'error';
            } else if (isManualStop) {
                status = 'cancelled';
            } else if (chaptersDownloaded > 0) {
                // Downloaded chapters - this is success, regardless of how/why it stopped
                status = 'success';
                displayMessage = `Downloaded ${chaptersDownloaded} chapter${chaptersDownloaded === 1 ? '' : 's'} - ${message}`;
            } else {
                // No chapters downloaded - this is no-content
                status = 'no-content';
                displayMessage = message; // Show the actual reason (abort message, etc.)
            }
            
            this.markStoryCompleted(storyId, status, displayMessage);
            
            // Auto-close tab for completed queue stories (both success and no-content)
            if (status === 'success' || status === 'no-content') {
                console.log(`Auto-closing tab ${tabId} for completed queue story (${status})`);
                chrome.tabs.remove(tabId).catch(() => {
                    // Ignore errors if tab is already closed
                });
            }
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

    // Get story ID for a tab (direct lookup)
    getStoryIdForTab(tabId) {
        return this.tabToStoryMap.get(tabId) || null;
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
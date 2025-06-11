// StoryTrackerStorage - Handles story tracking data storage and updates
export class StoryTrackerStorage {
    constructor() {
        this.STORAGE_KEY = "trackedStories";
    }

    // Get all tracked stories
    async getAllStories() {
        try {
            const result = await chrome.storage.local.get(this.STORAGE_KEY);
            return result[this.STORAGE_KEY] || [];
        } catch (error) {
            console.error("Error loading stories:", error);
            return [];
        }
    }

    // Save stories array
    async saveStories(stories) {
        try {
            await chrome.storage.local.set({ [this.STORAGE_KEY]: stories });
            console.log("Stories saved successfully");
            return true;
        } catch (error) {
            console.error("Error saving stories:", error);
            return false;
        }
    }

    // Add a new story
    async addStory(title, mainUrl, lastChapterUrl = "") {
        const stories = await this.getAllStories();
        
        // Check if story already exists
        const existingStory = stories.find(s => s.mainStoryUrl === mainUrl);
        if (existingStory) {
            console.log("Story already exists:", existingStory);
            return existingStory;
        }

        const story = {
            id: this.generateId(),
            title: title.trim(),
            mainStoryUrl: mainUrl.trim(),
            lastChapterUrl: lastChapterUrl.trim(),
            dateLastGrabbed: lastChapterUrl ? new Date().toISOString() : null,
            dateAdded: new Date().toISOString(),
            totalChapters: 0
        };

        stories.push(story);
        await this.saveStories(stories);
        return story;
    }

    // Update last grabbed chapter for a story
    async updateLastChapter(chapterUrl) {
        const stories = await this.getAllStories();
        
        // Extract the main story URL from the chapter URL
        const extractedMainUrl = this.extractMainStoryUrl(chapterUrl);
        
        // Find story where the extracted main URL starts with the story's mainStoryUrl
        // This allows flexible matching where chapter URLs can be longer than stored main URLs
        const story = stories.find(s => {
            return extractedMainUrl.startsWith(s.mainStoryUrl) || 
                   s.mainStoryUrl.startsWith(extractedMainUrl);
        });
        
        if (story) {
            story.lastChapterUrl = chapterUrl;
            story.dateLastGrabbed = new Date().toISOString();
            await this.saveStories(stories);
            console.log(`Updated last chapter for story: ${story.title}`);
            return story;
        }
        
        return null;
    }

    // Auto-track story when grabbing (if not already tracked)
    async autoTrackFromGrab(url, title = null) {
        // Extract main story URL (remove chapter-specific parts)
        const mainUrl = this.extractMainStoryUrl(url);
        
        const stories = await this.getAllStories();
        let story = stories.find(s => s.mainStoryUrl === mainUrl);
        
        if (!story && title) {
            // Auto-add new story
            story = await this.addStory(title, mainUrl, url);
            console.log("Auto-tracked new story:", story);
        } else if (story) {
            // Update existing story
            story = await this.updateLastChapter(url);
        }
        
        return story;
    }

    // Extract main story URL from chapter URL
    extractMainStoryUrl(chapterUrl) {
        // This is a simple implementation - you might want to make it more sophisticated
        // for different website patterns
        
        try {
            const url = new URL(chapterUrl);
            
            // Common patterns to remove chapter-specific parts
            const patterns = [
                /\/chapter[-_]?\d+.*$/i,
                /\/ch[-_]?\d+.*$/i,
                /\/\d+.*$/,
                /\/episode[-_]?\d+.*$/i,
                /\/part[-_]?\d+.*$/i
            ];
            
            let pathname = url.pathname;
            for (const pattern of patterns) {
                pathname = pathname.replace(pattern, "");
            }
            
            // Remove trailing slash
            pathname = pathname.replace(/\/$/, "");
            
            return `${url.protocol}//${url.host}${pathname}`;
        } catch (error) {
            console.error("Error extracting main URL:", error);
            return chapterUrl;
        }
    }

    // Generate unique ID
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Check if a URL is likely a story/chapter URL
    isStoryUrl(url) {
        try {
            const urlObj = new URL(url);
            const hostname = urlObj.hostname.toLowerCase();
            
            // List of known story/novel websites
            const storyDomains = [
                "ridibooks.com",
                "webnovel.com", 
                "readlightnovel.org",
                "novelfull.com",
                "readnovelfull.com",
                "wuxiaworld.com",
                "chrysanthemumgarden.com",
                "peachtea.agency",
                "hyacinthbloom.com",
                // Add more domains as needed
            ];
            
            return storyDomains.some(domain => hostname.includes(domain));
        } catch (error) {
            return false;
        }
    }

    // Get story by main URL
    async getStoryByMainUrl(mainUrl) {
        const stories = await this.getAllStories();
        return stories.find(s => s.mainStoryUrl === mainUrl);
    }

    // Get story by any URL (main or chapter)
    async getStoryByAnyUrl(url) {
        const stories = await this.getAllStories();
        
        // First try exact match on main URL
        let story = stories.find(s => s.mainStoryUrl === url);
        if (story) return story;
        
        // Then try exact match on last chapter URL
        story = stories.find(s => s.lastChapterUrl === url);
        if (story) return story;
        
        // Finally try extracting main URL and matching
        const mainUrl = this.extractMainStoryUrl(url);
        return stories.find(s => s.mainStoryUrl === mainUrl);
    }

    // Update story tracker with current chapter URL (called from script injector)
    async updateStoryTrackerFromTab(tabId) {
        try {
            const tab = await chrome.tabs.get(tabId);
            if (tab && tab.url && !tab.url.startsWith("chrome://") && !tab.url.startsWith("chrome-extension://")) {
                await this.updateLastChapter(tab.url);
            }
        } catch (error) {
            console.error("Error updating story tracker:", error);
        }
    }
}
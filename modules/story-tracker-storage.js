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

    // Update last grabbed chapter for a story
    async updateLastChapter(chapterUrl, chapterTitle = null) {
        const stories = await this.getAllStories();
        
        // Extract the main story URL from the chapter URL
        const extractedMainUrl = this.extractMainStoryUrl(chapterUrl);
        
        // Find story where the chapter URL actually belongs to the story
        // Must be exact match or the chapter URL should start with the story's main URL
        const story = stories.find(s => {
            // Normalize URLs by removing trailing slashes for comparison
            const normalizedExtracted = extractedMainUrl.replace(/\/$/, "");
            const normalizedStoryUrl = s.mainStoryUrl.replace(/\/$/, "");
            const normalizedChapterUrl = chapterUrl.replace(/\/$/, "");
            
            // Exact match on normalized extracted main URL
            if (normalizedExtracted === normalizedStoryUrl) {
                return true;
            }
            
            // Chapter URL should start with the story's main URL followed by / or ?
            // This prevents books/1 from matching books/2 chapters
            if (normalizedChapterUrl.startsWith(normalizedStoryUrl)) {
                const afterMainUrl = normalizedChapterUrl.substring(normalizedStoryUrl.length);
                return afterMainUrl.startsWith("/") || afterMainUrl.startsWith("?") || afterMainUrl === "";
            }
            
            return false;
        });
        
        if (story) {
            story.lastChapterUrl = chapterUrl;
            story.dateLastGrabbed = new Date().toISOString();
            if (chapterTitle) {
                story.lastChapterTitle = chapterTitle;
            }
            await this.saveStories(stories);
            console.log(`Updated last chapter for story: ${story.title}`);
            return story;
        }
        
        return null;
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
}
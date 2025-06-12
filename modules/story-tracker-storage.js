// StoryTrackerStorage - Handles story tracking data storage and updates
export class StoryTrackerStorage {
    constructor() {
        this.STORY_PREFIX = "story_";
    }

    // Get story key for individual storage
    getStoryKey(storyId) {
        return `${this.STORY_PREFIX}${storyId}`;
    }

    // Get all tracked stories from individual storage
    async getAllStories() {
        try {
            // Get all storage data
            const allData = await chrome.storage.local.get();
            
            // Filter for story entries and extract the story objects
            const stories = Object.entries(allData)
                .filter(([key]) => key.startsWith(this.STORY_PREFIX))
                .map(([, story]) => story);
                
            return stories;
        } catch (error) {
            console.error("Error loading stories:", error);
            return [];
        }
    }

    // Save individual story
    async saveStory(story) {
        try {
            const key = this.getStoryKey(story.id);
            await chrome.storage.local.set({ [key]: story });
            console.log(`Story saved: ${story.title}`);
            return true;
        } catch (error) {
            console.error("Error saving story:", error);
            return false;
        }
    }

    // Delete individual story
    async deleteStory(storyId) {
        try {
            const key = this.getStoryKey(storyId);
            await chrome.storage.local.remove(key);
            console.log(`Story deleted: ${storyId}`);
            return true;
        } catch (error) {
            console.error("Error deleting story:", error);
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
            // Check if this is the same chapter as before (potential loop detection)
            if (story.lastChapterUrl === chapterUrl) {
                console.log(`Duplicate chapter detected for "${story.title}": ${chapterUrl}`);
                
                // Send message to stop bulk grabbing
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "stopBulkGrab"
                });
                
                console.log("Sent stopBulkGrab message due to duplicate chapter");
                return story; // Don't update anything, just return
            }
            
            // Update the story object
            story.lastChapterUrl = chapterUrl;
            story.dateLastGrabbed = new Date().toISOString();
            if (chapterTitle) {
                story.lastChapterTitle = this.cleanTitle(chapterTitle, story.title);
            }
            
            // Save just this story
            await this.saveStory(story);
            console.log(`Updated last chapter for story: ${story.title}`);
            return story;
        }
        
        return null;
    }

    // Clean chapter title by removing story title and domain suffix
    cleanTitle(chapterTitle, storyTitle = null) {
        if (!chapterTitle) return chapterTitle;
        
        let cleanedTitle = chapterTitle;
        
        // Remove story title from beginning if it exists
        if (storyTitle) {
            // Try exact match first
            if (cleanedTitle.toLowerCase().startsWith(storyTitle.toLowerCase())) {
                cleanedTitle = cleanedTitle.substring(storyTitle.length);
            }
            
            // Try removing common separators after story title
            const separators = [' - ', ': ', ' – ', ' | ', ' — '];
            for (const sep of separators) {
                const prefix = storyTitle + sep;
                if (cleanedTitle.toLowerCase().startsWith(prefix.toLowerCase())) {
                    cleanedTitle = cleanedTitle.substring(prefix.length);
                    break;
                }
            }
        }
        
        // Remove domain suffix (e.g., "_transweaver.com", "_hyacinthbloom.com")
        cleanedTitle = cleanedTitle.replace(/_[a-z0-9.-]+\.[a-z]{2,}$/i, '');
        
        // Remove leading/trailing whitespace and common separators
        cleanedTitle = cleanedTitle.replace(/^[\s\-:–|—]+|[\s\-:–|—]+$/g, '').trim();
        
        return cleanedTitle || chapterTitle; // Return original if cleaning resulted in empty string
    }

    // Extract main story URL from chapter URL
    extractMainStoryUrl(chapterUrl) {
        // This is a simple implementation - you might want to make it more sophisticated
        // for different website patterns
        
        try {
            const url = new URL(chapterUrl);
            
            // Special handling for hyacinthbloom.com
            // Chapter: https://hyacinthbloom.com/story-name/chapter-name/
            // Should become: https://hyacinthbloom.com/series/story-name/
            if (url.hostname === 'hyacinthbloom.com') {
                const pathParts = url.pathname.split('/').filter(part => part);
                if (pathParts.length >= 2 && !pathParts[0].includes('series')) {
                    // First part is the story name, convert to series URL
                    return `${url.protocol}//${url.host}/series/${pathParts[0]}/`;
                }
            }
            
            // Special handling for transweaver.com
            // Chapter: https://transweaver.com/25/11/2024/46479/a-case-of-transmigrating-as-a-sick-villain-chapter-195/
            // Should become: https://transweaver.com/series/a-case-of-transmigrating-as-a-sick-villain/
            if (url.hostname === 'transweaver.com') {
                const pathParts = url.pathname.split('/').filter(part => part);
                if (pathParts.length >= 5) {
                    // Last part contains the story slug with chapter info
                    const lastPart = pathParts[pathParts.length - 1];
                    // Extract story slug by removing chapter/epilogue suffix
                    const storySlug = lastPart.replace(/-(?:chapter|epilogue).*$/i, '');
                    return `${url.protocol}//${url.host}/series/${storySlug}/`;
                }
            }
            
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
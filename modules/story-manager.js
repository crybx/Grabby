// Story Manager - Background script version of story-tracker.js
// There's duplication here with content-scripts/story-tracker.js
// Figure out later the best way to do this only in one spot.

export class StoryManager {
    static STORY_PREFIX = "story_";

    // Get story key for individual storage
    static getStoryKey(storyId) {
        return `${this.STORY_PREFIX}${storyId}`;
    }

    // Get all tracked stories from individual storage
    static async getAllStories() {
        try {
            // Get all storage data
            const allData = await chrome.storage.local.get();
            
            // Filter for story entries and extract the story objects
            return Object.entries(allData)
                .filter(([key]) => key.startsWith(this.STORY_PREFIX))
                .map(([, story]) => story);
        } catch (error) {
            console.error("Error loading stories:", error);
            return [];
        }
    }

    // Save individual story
    static async saveStory(story) {
        try {
            // Generate ID if not present
            if (!story.id) {
                // Check if mainStoryUrl already exists
                const existingStories = await this.getAllStories();
                const duplicateStory = existingStories.find(s => s.mainStoryUrl === story.mainStoryUrl);
                
                if (duplicateStory) {
                    return false; // Don't save duplicate
                }
                
                story.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
            }

            // Extract domain if not provided
            if (!story.domain && story.mainStoryUrl) {
                try {
                    story.domain = new URL(story.mainStoryUrl).hostname;
                } catch {
                    story.domain = "unknown";
                }
            }
            
            const key = this.getStoryKey(story.id);
            await chrome.storage.local.set({ [key]: story });
            return true;
        } catch (error) {
            console.error("Error saving story:", error);
            return false;
        }
    }

    // Get individual story by ID
    static async getStory(storyId) {
        try {
            const key = this.getStoryKey(storyId);
            const result = await chrome.storage.local.get(key);
            return result[key] || null;
        } catch (error) {
            console.error("Error getting story:", error);
            return null;
        }
    }

    // Delete individual story
    static async deleteStory(storyId) {
        try {
            const key = this.getStoryKey(storyId);
            await chrome.storage.local.remove(key);
            return true;
        } catch (error) {
            console.error("Error deleting story:", error);
            return false;
        }
    }

    // Extract main story URL from chapter URL
    static extractMainStoryUrl(chapterUrl) {
        try {
            const url = new URL(chapterUrl);
            
            // Special handling for hyacinthbloom.com
            if (url.hostname === "hyacinthbloom.com") {
                const pathParts = url.pathname.split("/").filter(part => part);
                if (pathParts.length >= 2 && !pathParts[0].includes("series")) {
                    return `${url.protocol}//${url.host}/series/${pathParts[0]}/`;
                }
            }
            
            // Special handling for transweaver.com
            if (url.hostname === "transweaver.com") {
                const pathParts = url.pathname.split("/").filter(part => part);
                if (pathParts.length >= 5) {
                    const lastPart = pathParts[pathParts.length - 1];
                    const storySlug = lastPart.replace(/-(?:chapter|epilogue).*$/i, "");
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
            
            pathname = pathname.replace(/\/$/, "");
            
            return `${url.protocol}//${url.host}${pathname}`;
        } catch (error) {
            console.error("Error extracting main URL:", error);
            return chapterUrl;
        }
    }

    // Find story that matches a chapter URL
    static async findStoryByChapterUrl(chapterUrl) {
        const stories = await this.getAllStories();
        
        // Extract the main story URL from the chapter URL
        const extractedMainUrl = this.extractMainStoryUrl(chapterUrl);
        
        // Find story where the chapter URL actually belongs to the story
        return stories.find(s => {
            // Normalize URLs by removing trailing slashes for comparison
            const normalizedExtracted = extractedMainUrl.replace(/\/$/, "");
            const normalizedStoryUrl = s.mainStoryUrl.replace(/\/$/, "");
            const normalizedChapterUrl = chapterUrl.replace(/\/$/, "");
            
            // Exact match on normalized extracted main URL
            if (normalizedExtracted === normalizedStoryUrl) {
                return true;
            }
            
            // Chapter URL should start with the story's main URL followed by / or ?
            if (normalizedChapterUrl.startsWith(normalizedStoryUrl)) {
                const afterMainUrl = normalizedChapterUrl.substring(normalizedStoryUrl.length);
                if (afterMainUrl.startsWith("/") || afterMainUrl.startsWith("?") || afterMainUrl === "") {
                    return true;
                }
            }
            
            // Check secondary URL matches if they exist
            if (s.secondaryUrlMatches && Array.isArray(s.secondaryUrlMatches)) {
                for (const urlPrefix of s.secondaryUrlMatches) {
                    if (urlPrefix && normalizedChapterUrl.startsWith(urlPrefix.replace(/\/$/, ""))) {
                        return true;
                    }
                }
            }
            
            return false;
        });
    }

    // Clean chapter title by keeping only numbers, punctuation, and spaces
    static cleanTitle(chapterTitle, storyTitle = null) {
        if (!chapterTitle) return chapterTitle;
        
        // Remove all letters and periods (keep only numbers, punctuation, and spaces)
        let cleanedTitle = chapterTitle.replace(/[a-zA-Z]/g, "");
        
        // Collapse multiple spaces to single space
        cleanedTitle = cleanedTitle.replace(/\s+/g, " ");
        
        // Remove leading/trailing whitespace
        cleanedTitle = cleanedTitle.trim();
        
        // Trim any non-numbers from the start position
        cleanedTitle = cleanedTitle.replace(/^[^0-9]+/, "");
        
        // Trim any non-numbers from the end, but allow ) and ] to remain
        cleanedTitle = cleanedTitle.replace(/[^0-9)\]]+$/, "");
        
        return cleanedTitle || chapterTitle;
    }

    // Update last check status for a story (used for aborts or other check results)
    static async updateLastCheckStatus(chapterUrl, status, storyId = null) {
        // If storyId is provided (from queue context), use it directly
        let story;
        if (storyId) {
            story = await this.getStory(storyId);
        } else if (chapterUrl) {
            story = await this.findStoryByChapterUrl(chapterUrl);
        }
        
        if (story) {
            // Update the story object with check status
            story.dateLastChecked = new Date().toISOString();
            story.lastCheckStatus = status;
            
            // Save just this story
            await this.saveStory(story);
            return story;
        }
        
        return null;
    }

    // Update last grabbed chapter for a story
    static async updateLastChapter(chapterUrl, chapterTitle = null, storyId = null) {
        // If storyId is provided (from queue context), use it directly
        let story;
        if (storyId) {
            story = await this.getStory(storyId);
        } else {
            // Fall back to URL matching for non-queue grabs
            story = await this.findStoryByChapterUrl(chapterUrl);
        }
        
        if (story) {
            // Check if this is the same chapter as before (potential loop detection)
            // Normalize URLs for comparison to handle /# variations
            const normalizedCurrent = this.normalizeUrlForComparison(chapterUrl);
            const normalizedLast = this.normalizeUrlForComparison(story.lastChapterUrl);
            
            if (normalizedLast === normalizedCurrent) {
                // Update story tracker status and send stop grabbing message
                const duplicateMessage = "Duplicate chapter detected - stopping to prevent loop";
                await this.updateLastCheckStatus(chapterUrl, duplicateMessage);
                
                // Send message to stop grabbing
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "stopGrabbing",
                    url: chapterUrl,
                    status: duplicateMessage
                });
                
                return story; // Don't update anything, just return
            }
            
            // Update the story object
            story.lastChapterUrl = chapterUrl;
            const now = new Date().toISOString();
            story.dateLastGrabbed = now;
            story.dateLastChecked = now; // Set both dates equal when successfully grabbed
            story.lastCheckStatus = "Grabbed"; // Set status when successfully grabbed
            if (chapterTitle) {
                story.lastChapterTitle = this.cleanTitle(chapterTitle, story.title);
            }
            
            // Save just this story
            await this.saveStory(story);
            return story;
        }
        
        return null;
    }

    // Normalize URL by removing trailing /# patterns for comparison
    static normalizeUrlForComparison(url) {
        if (!url) return url;
        // Remove trailing slash followed by empty hash, or just empty hash
        // This handles: /# or # at the end, but preserves meaningful fragments like #chapter2
        let normalized = url.replace(/\/?#$/, "");
        // Also remove trailing slash for consistent comparison
        normalized = normalized.replace(/\/$/, "");
        return normalized;
    }

    // Check if current URL is a duplicate of last chapter (for pre-grab detection)
    static async isDuplicateChapter(chapterUrl) {
        const story = await this.findStoryByChapterUrl(chapterUrl);
        if (!story || !story.lastChapterUrl) return false;
        
        // Normalize both URLs for comparison
        const normalizedCurrent = this.normalizeUrlForComparison(chapterUrl);
        const normalizedLast = this.normalizeUrlForComparison(story.lastChapterUrl);
        
        return normalizedCurrent === normalizedLast;
    }
}
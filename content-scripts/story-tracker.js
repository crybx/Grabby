// Story Tracker - Handles story tracking data storage and updates

const STORY_PREFIX = "story_";

// Get story key for individual storage
function getStoryKey(storyId) {
    return `${STORY_PREFIX}${storyId}`;
}

// Get all tracked stories from individual storage
async function getAllStories() {
    try {
        // Get all storage data
        const allData = await chrome.storage.local.get();
        
        // Filter for story entries and extract the story objects
        const stories = Object.entries(allData)
            .filter(([key]) => key.startsWith(STORY_PREFIX))
            .map(([, story]) => story);
            
        return stories;
    } catch (error) {
        console.error("Error loading stories:", error);
        return [];
    }
}

// Save individual story
async function saveStory(story) {
    try {
        // Generate ID if not present
        if (!story.id) {
            // Check if mainStoryUrl already exists
            const existingStories = await getAllStories();
            const duplicateStory = existingStories.find(s => s.mainStoryUrl === story.mainStoryUrl);
            
            if (duplicateStory) {
                return false; // Don't save duplicate
            }
            
            story.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
        }
        
        const key = getStoryKey(story.id);
        await chrome.storage.local.set({ [key]: story });
        return true;
    } catch (error) {
        console.error("Error saving story:", error);
        return false;
    }
}

// Get individual story by ID
async function getStory(storyId) {
    try {
        const key = getStoryKey(storyId);
        const result = await chrome.storage.local.get(key);
        return result[key] || null;
    } catch (error) {
        console.error("Error getting story:", error);
        return null;
    }
}

// Delete individual story
async function deleteStory(storyId) {
    try {
        const key = getStoryKey(storyId);
        await chrome.storage.local.remove(key);
        return true;
    } catch (error) {
        console.error("Error deleting story:", error);
        return false;
    }
}

// Extract main story URL from chapter URL
function extractMainStoryUrl(chapterUrl) {
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
async function findStoryByChapterUrl(chapterUrl) {
    const stories = await getAllStories();
    
    // Extract the main story URL from the chapter URL
    const extractedMainUrl = extractMainStoryUrl(chapterUrl);
    
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

// Clean chapter title by removing story title and domain suffix
function cleanTitle(chapterTitle, storyTitle = null) {
    if (!chapterTitle) return chapterTitle;
    
    let cleanedTitle = chapterTitle;
    
    // Remove story title from anywhere in the string if it exists
    if (storyTitle) {
        const storyTitleRegex = new RegExp(storyTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
        cleanedTitle = cleanedTitle.replace(storyTitleRegex, "");
    }
    
    // Remove domain names (with or without leading underscore, with or without suffixes)
    // This handles cases like "_ridibooks.com", "_ridibooks", "ridibooks.com", or "ridibooks"
    cleanedTitle = cleanedTitle.replace(/[_\s]*([a-z0-9.-]+)(?:\.[a-z]{2,})?$/i, "");
    
    // Replace all separators with whitespace
    cleanedTitle = cleanedTitle.replace(/[-:–|—_!]+/g, " ");
    
    // Remove common words and domain names
    const wordsToRemove = [
        "chapter",
        "episode",
        "translation\\s+weaver",
        "story\\s+seedling",
        "ridibooks",
        "maplesan\\s+translations",
        "emptymurmurs",
        "darkstar\\s+translations",
        "✿ dusk blossoms ✿"
    ];

    cleanedTitle = cleanedTitle.replace(
        new RegExp(`\\b(${wordsToRemove.join("|")})\\b`, "gi"),
        ""
    );

    // Collapse multiple whitespace to single space
    cleanedTitle = cleanedTitle.replace(/\s+/g, " ");
    
    // Remove leading/trailing whitespace
    cleanedTitle = cleanedTitle.trim();
    
    return cleanedTitle || chapterTitle;
}

// Update last check status for a story (used for aborts or other check results)
async function updateLastCheckStatus(chapterUrl, status, storyId = null) {
    console.log(`StoryTracker.updateLastCheckStatus called: URL=${chapterUrl}, status=${status}, storyId=${storyId}`);
    
    // If storyId is provided (from queue context), use it directly
    let story;
    if (storyId) {
        story = await getStory(storyId);
    } else {
        story = await findStoryByChapterUrl(chapterUrl);
    }
    
    if (story) {
        // Update the story object with check status
        story.dateLastChecked = new Date().toISOString();
        story.lastCheckStatus = status;
        
        // Save just this story
        await saveStory(story);
        return story;
    }
    
    return null;
}

// Update last grabbed chapter for a story
async function updateLastChapter(chapterUrl, chapterTitle = null, storyId = null) {
    console.log(`StoryTracker.updateLastChapter called: URL=${chapterUrl}, title=${chapterTitle}, storyId=${storyId}`);
    
    // If storyId is provided (from queue context), use it directly
    let story;
    if (storyId) {
        story = await getStory(storyId);
    } else {
        // Fall back to URL matching for non-queue grabs
        story = await findStoryByChapterUrl(chapterUrl);
    }
    
    if (story) {
        // Check if this is the same chapter as before (potential loop detection)
        // Normalize URLs for comparison to handle /# variations
        const normalizedCurrent = normalizeUrlForComparison(chapterUrl);
        const normalizedLast = normalizeUrlForComparison(story.lastChapterUrl);
        
        if (normalizedLast === normalizedCurrent) {
            // Update story tracker status and send stop grabbing message
            const duplicateMessage = "Duplicate chapter detected - stopping to prevent loop";
            await updateLastCheckStatus(chapterUrl, duplicateMessage);
            
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
            story.lastChapterTitle = cleanTitle(chapterTitle, story.title);
        }
        
        // Save just this story
        await saveStory(story);
        return story;
    }
    
    return null;
}

// Normalize URL by removing trailing /# patterns for comparison
function normalizeUrlForComparison(url) {
    if (!url) return url;
    // Remove trailing slash followed by empty hash, or just empty hash
    // This handles: /# or # at the end, but preserves meaningful fragments like #chapter2
    let normalized = url.replace(/\/?#$/, "");
    // Also remove trailing slash for consistent comparison
    normalized = normalized.replace(/\/$/, "");
    return normalized;
}

// Check if current URL is a duplicate of last chapter (for pre-grab detection)
async function isDuplicateChapter(chapterUrl) {
    const story = await findStoryByChapterUrl(chapterUrl);
    if (!story || !story.lastChapterUrl) return false;
    
    // Normalize both URLs for comparison
    const normalizedCurrent = normalizeUrlForComparison(chapterUrl);
    const normalizedLast = normalizeUrlForComparison(story.lastChapterUrl);
    
    return normalizedCurrent === normalizedLast;
}

// Export functions to window for global access
window.StoryTracker = {
    getStoryKey,
    getAllStories,
    getStory,
    saveStory,
    deleteStory,
    extractMainStoryUrl,
    findStoryByChapterUrl,
    cleanTitle,
    updateLastCheckStatus,
    updateLastChapter,
    isDuplicateChapter,
    normalizeUrlForComparison
};
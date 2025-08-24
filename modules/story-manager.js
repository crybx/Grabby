// There's duplication here with content-scripts/story-tracker.js
// Figure out later the best way to do this only in one spot.

export class StoryManager {
    static async getAllStories() {
        const allData = await chrome.storage.local.get();
        return Object.entries(allData)
            .filter(([key]) => key.startsWith("story_"))
            .map(([, story]) => story);
    }

    static async saveStory(story) {
        // If it's a new story, check for duplicate and generate id
        if (!story.id && story.mainStoryUrl) {
            const existingStories = await this.getAllStories();
            const duplicateStory = existingStories.find(s => s.mainStoryUrl === story.mainStoryUrl);
            
            if (duplicateStory) {
                return;
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

        await chrome.storage.local.set({ [`story_${story.id}`]: story });
    }
}

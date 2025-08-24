// ES6 module wrapper for StoryManager
// This allows background.js to import StoryManager while keeping the main file injectable

// Import the main StoryManager script (this will execute it and set globalThis.StoryManager)
import "../content-scripts/story-manager.js";

// Re-export from globalThis
export const StoryManager = globalThis.StoryManager;
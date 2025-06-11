// Story Tracker - Manages reading progress and story tracking
class StoryTracker {
    constructor() {
        this.stories = [];
        this.init();
    }

    async init() {
        await this.loadStories();
        this.setupEventListeners();
        this.renderStories();
    }

    // Load stories from extension storage
    async loadStories() {
        try {
            const result = await chrome.storage.local.get("trackedStories");
            this.stories = result.trackedStories || [];
            console.log("Loaded stories:", this.stories);
        } catch (error) {
            console.error("Error loading stories:", error);
            this.stories = [];
        }
    }

    // Save stories to extension storage
    async saveStories() {
        try {
            await chrome.storage.local.set({ "trackedStories": this.stories });
            console.log("Stories saved successfully");
        } catch (error) {
            console.error("Error saving stories:", error);
        }
    }

    // Generate unique ID for stories
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    // Add new story
    async addStory(title, mainUrl, lastChapterUrl = "") {
        const story = {
            id: this.generateId(),
            title: title.trim(),
            mainStoryUrl: mainUrl.trim(),
            lastChapterUrl: lastChapterUrl.trim(),
            dateLastGrabbed: lastChapterUrl ? new Date().toISOString() : null,
            dateAdded: new Date().toISOString(),
            totalChapters: 0
        };

        this.stories.push(story);
        await this.saveStories();
        this.renderStories();
        return story;
    }

    // Update existing story
    async updateStory(id, updates) {
        const storyIndex = this.stories.findIndex(s => s.id === id);
        if (storyIndex !== -1) {
            this.stories[storyIndex] = { ...this.stories[storyIndex], ...updates };
            await this.saveStories();
            this.renderStories();
            return this.stories[storyIndex];
        }
        return null;
    }

    // Delete story
    async deleteStory(id) {
        this.stories = this.stories.filter(s => s.id !== id);
        await this.saveStories();
        this.renderStories();
    }

    // Update last chapter for a story (called when grabbing)
    async updateLastChapter(mainUrl, chapterUrl) {
        const story = this.stories.find(s => s.mainStoryUrl === mainUrl);
        if (story) {
            story.lastChapterUrl = chapterUrl;
            story.dateLastGrabbed = new Date().toISOString();
            await this.saveStories();
            this.renderStories();
        }
    }

    // Render all stories to the page
    renderStories() {
        const container = document.getElementById("stories-container");
        const noStoriesDiv = document.getElementById("no-stories");

        if (this.stories.length === 0) {
            container.style.display = "none";
            noStoriesDiv.style.display = "block";
            return;
        }

        noStoriesDiv.style.display = "none";
        container.style.display = "grid";

        container.innerHTML = this.stories.map(story => this.renderStoryCard(story)).join("");

        // Add event listeners to story cards
        this.attachStoryCardListeners();
    }

    // Render individual story card
    renderStoryCard(story) {
        const lastGrabbedText = story.dateLastGrabbed 
            ? `Last grabbed: ${this.formatDate(story.dateLastGrabbed)}`
            : "Never grabbed";

        const lastChapterDisplay = story.lastChapterUrl 
            ? `<a href="${story.lastChapterUrl}" target="_blank" class="chapter-link" title="Open last chapter">
                 📄 ${story.lastChapterTitle || "Last Chapter"}
               </a>`
            : "<span class=\"no-chapter\">No last chapter</span>";

        return `
            <div class="story-card" data-story-id="${story.id}">
                <div class="story-header">
                    <h3 class="story-title">
                        <a href="${story.mainStoryUrl}" target="_blank" class="story-title-link" title="Open main story">
                            ${story.title}
                        </a>
                    </h3>
                    <div class="story-actions">
                        <button class="edit-story-btn" data-story-id="${story.id}" title="Edit story">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                            </svg>
                        </button>
                    </div>
                </div>
                
                <div class="story-links">
                    ${lastChapterDisplay}
                </div>
                
                <div class="story-meta">
                    <div class="last-grabbed">${lastGrabbedText}</div>
                    <div class="date-added">Added: ${this.formatDate(story.dateAdded)}</div>
                </div>
            </div>
        `;
    }

    // Format date for display
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        // For recent dates, show relative time with actual time
        if (diffDays === 1) {
            const timeString = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
            return `Today at ${timeString}`;
        }
        if (diffDays === 2) {
            const timeString = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
            return `Yesterday at ${timeString}`;
        }
        
        // For older dates, show full date and time
        const dateString = date.toLocaleDateString();
        const timeString = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
        return `${dateString} at ${timeString}`;
    }

    // Attach event listeners to story cards
    attachStoryCardListeners() {
        // Edit buttons
        document.querySelectorAll(".edit-story-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                e.stopPropagation();
                const storyId = btn.getAttribute("data-story-id");
                this.openEditModal(storyId);
            });
        });
    }

    // Setup main event listeners
    setupEventListeners() {
        // Add story buttons
        document.getElementById("add-story-btn").addEventListener("click", () => this.openAddModal());
        document.getElementById("add-first-story-btn").addEventListener("click", () => this.openAddModal());
        
        // Refresh button
        document.getElementById("refresh-btn").addEventListener("click", () => this.refreshStories());

        // Add story modal
        document.getElementById("close-modal").addEventListener("click", () => this.closeAddModal());
        document.getElementById("cancel-btn").addEventListener("click", () => this.closeAddModal());
        document.getElementById("add-story-form").addEventListener("submit", (e) => this.handleAddStory(e));

        // Edit story modal
        document.getElementById("close-edit-modal").addEventListener("click", () => this.closeEditModal());
        document.getElementById("cancel-edit-btn").addEventListener("click", () => this.closeEditModal());
        document.getElementById("edit-story-form").addEventListener("submit", (e) => this.handleEditStory(e));
        document.getElementById("delete-story-btn").addEventListener("click", () => this.handleDeleteStory());

        // Close modals when clicking outside
        document.getElementById("add-story-modal").addEventListener("click", (e) => {
            if (e.target.id === "add-story-modal") this.closeAddModal();
        });
        document.getElementById("edit-story-modal").addEventListener("click", (e) => {
            if (e.target.id === "edit-story-modal") this.closeEditModal();
        });
    }

    // Modal management
    openAddModal() {
        document.getElementById("add-story-modal").style.display = "block";
        document.getElementById("story-title").focus();
    }

    closeAddModal() {
        document.getElementById("add-story-modal").style.display = "none";
        document.getElementById("add-story-form").reset();
    }

    openEditModal(storyId) {
        const story = this.stories.find(s => s.id === storyId);
        if (!story) return;

        document.getElementById("edit-story-id").value = story.id;
        document.getElementById("edit-story-title").value = story.title;
        document.getElementById("edit-main-story-url").value = story.mainStoryUrl;
        document.getElementById("edit-last-chapter-url").value = story.lastChapterUrl || "";

        document.getElementById("edit-story-modal").style.display = "block";
        document.getElementById("edit-story-title").focus();
    }

    closeEditModal() {
        document.getElementById("edit-story-modal").style.display = "none";
        document.getElementById("edit-story-form").reset();
    }

    // Form handlers
    async handleAddStory(e) {
        e.preventDefault();
        
        const title = document.getElementById("story-title").value;
        const mainUrl = document.getElementById("main-story-url").value;
        const lastChapterUrl = document.getElementById("last-chapter-url").value;

        try {
            await this.addStory(title, mainUrl, lastChapterUrl);
            this.closeAddModal();
        } catch (error) {
            console.error("Error adding story:", error);
            alert("Error adding story. Please try again.");
        }
    }

    async handleEditStory(e) {
        e.preventDefault();
        
        const id = document.getElementById("edit-story-id").value;
        const title = document.getElementById("edit-story-title").value;
        const mainUrl = document.getElementById("edit-main-story-url").value;
        const lastChapterUrl = document.getElementById("edit-last-chapter-url").value;

        try {
            await this.updateStory(id, {
                title: title.trim(),
                mainStoryUrl: mainUrl.trim(),
                lastChapterUrl: lastChapterUrl.trim()
            });
            this.closeEditModal();
        } catch (error) {
            console.error("Error updating story:", error);
            alert("Error updating story. Please try again.");
        }
    }

    async handleDeleteStory() {
        const id = document.getElementById("edit-story-id").value;
        const story = this.stories.find(s => s.id === id);
        
        if (confirm(`Are you sure you want to delete "${story.title}"? This cannot be undone.`)) {
            try {
                await this.deleteStory(id);
                this.closeEditModal();
            } catch (error) {
                console.error("Error deleting story:", error);
                alert("Error deleting story. Please try again.");
            }
        }
    }

    // Refresh stories from storage
    async refreshStories() {
        await this.loadStories();
        this.renderStories();
    }
}

// Initialize when page loads
document.addEventListener("DOMContentLoaded", () => {
    window.storyTracker = new StoryTracker();
});
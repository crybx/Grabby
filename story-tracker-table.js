// Story Tracker Table - Enhanced version with filtering, sorting, and selection
class StoryTrackerTable {
    constructor() {
        this.stories = [];
        this.filteredStories = [];
        this.selectedStories = new Set();
        this.sortColumn = "dateAdded";
        this.sortDirection = "desc";
        this.filterText = "";
        this.domainFilter = "";

        this.init();
    }

    async init() {
        await this.loadStories();
        this.setupEventListeners();
        this.populateDomainFilter();
        this.renderTable();
    }

    async loadStories() {
        try {
            const result = await chrome.storage.local.get("trackedStories");
            this.stories = result.trackedStories || [];
            this.applyFilters();
        } catch (error) {
            console.error("Error loading stories:", error);
            this.stories = [];
        }
    }

    async saveStories() {
        try {
            await chrome.storage.local.set({ trackedStories: this.stories });
            return true;
        } catch (error) {
            console.error("Error saving stories:", error);
            return false;
        }
    }

    setupEventListeners() {
        // Filter input
        document.getElementById("filter-input").addEventListener("input", (e) => {
            this.filterText = e.target.value.toLowerCase();
            this.applyFilters();
            this.renderTable();
        });

        // Domain filter
        document.getElementById("domain-filter").addEventListener("change", (e) => {
            this.domainFilter = e.target.value;
            this.applyFilters();
            this.renderTable();
        });

        // Selection controls
        document.getElementById("select-all-checkbox").addEventListener("change", (e) => {
            this.handleSelectAll(e.target.checked);
        });

        document.getElementById("select-all-btn").addEventListener("click", () => {
            this.selectAllVisible();
        });

        document.getElementById("clear-selection-btn").addEventListener("click", () => {
            this.clearSelection();
        });

        // Bulk actions
        document.getElementById("open-last-chapters-btn").addEventListener("click", () => {
            this.openLastChapters();
        });

        // Sort headers
        document.querySelectorAll(".sortable").forEach(header => {
            header.addEventListener("click", () => {
                const column = header.dataset.sort;
                this.handleSort(column);
            });
        });

        // Modal controls
        document.getElementById("add-story-btn").addEventListener("click", () => {
            this.showAddModal();
        });

        document.getElementById("add-first-story-btn").addEventListener("click", () => {
            this.showAddModal();
        });

        document.getElementById("close-modal").addEventListener("click", () => {
            this.hideAddModal();
        });

        document.getElementById("close-edit-modal").addEventListener("click", () => {
            this.hideEditModal();
        });

        document.getElementById("cancel-btn").addEventListener("click", () => {
            this.hideAddModal();
        });

        document.getElementById("cancel-edit-btn").addEventListener("click", () => {
            this.hideEditModal();
        });

        // Form submissions
        document.getElementById("add-story-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleAddStory();
        });

        document.getElementById("edit-story-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleEditStory();
        });

        document.getElementById("delete-story-btn").addEventListener("click", () => {
            this.handleDeleteStory();
        });

        document.getElementById("refresh-btn").addEventListener("click", () => {
            this.refresh();
        });
    }

    applyFilters() {
        this.filteredStories = this.stories.filter(story => {
            // Text filter
            const matchesText = !this.filterText || 
                story.title.toLowerCase().includes(this.filterText) ||
                story.mainStoryUrl.toLowerCase().includes(this.filterText) ||
                (story.lastChapterTitle && story.lastChapterTitle.toLowerCase().includes(this.filterText));

            // Domain filter
            const domain = this.extractDomain(story.mainStoryUrl);
            const matchesDomain = !this.domainFilter || domain === this.domainFilter;

            return matchesText && matchesDomain;
        });

        this.applySorting();
    }

    applySorting() {
        this.filteredStories.sort((a, b) => {
            let aValue, bValue;

            switch (this.sortColumn) {
            case "title":
                aValue = a.title.toLowerCase();
                bValue = b.title.toLowerCase();
                break;
            case "domain":
                aValue = this.extractDomain(a.mainStoryUrl);
                bValue = this.extractDomain(b.mainStoryUrl);
                break;
            case "lastChapter":
                aValue = a.lastChapterTitle || a.lastChapterUrl || "";
                bValue = b.lastChapterTitle || b.lastChapterUrl || "";
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
                break;
            case "dateLastGrabbed":
                aValue = new Date(a.dateLastGrabbed || 0);
                bValue = new Date(b.dateLastGrabbed || 0);
                break;
            case "dateAdded":
                aValue = new Date(a.dateAdded);
                bValue = new Date(b.dateAdded);
                break;
            default:
                return 0;
            }

            if (aValue < bValue) return this.sortDirection === "asc" ? -1 : 1;
            if (aValue > bValue) return this.sortDirection === "asc" ? 1 : -1;
            return 0;
        });
    }

    handleSort(column) {
        if (this.sortColumn === column) {
            this.sortDirection = this.sortDirection === "asc" ? "desc" : "asc";
        } else {
            this.sortColumn = column;
            this.sortDirection = "asc";
        }

        this.applyFilters();
        this.renderTable();
        this.updateSortIndicators();
    }

    updateSortIndicators() {
        document.querySelectorAll(".sort-indicator").forEach(indicator => {
            indicator.textContent = "";
        });

        const activeHeader = document.querySelector(`[data-sort="${this.sortColumn}"] .sort-indicator`);
        if (activeHeader) {
            activeHeader.textContent = this.sortDirection === "asc" ? "↑" : "↓";
        }
    }

    populateDomainFilter() {
        const domains = [...new Set(this.stories.map(story => this.extractDomain(story.mainStoryUrl)))];
        domains.sort();

        const select = document.getElementById("domain-filter");
        select.innerHTML = "<option value=\"\">All Domains</option>";

        domains.forEach(domain => {
            const option = document.createElement("option");
            option.value = domain;
            option.textContent = domain;
            select.appendChild(option);
        });
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return "unknown";
        }
    }

    renderTable() {
        const tbody = document.getElementById("stories-tbody");
        const emptyState = document.getElementById("no-stories");
        const tableContainer = document.querySelector(".table-container");
        const tableControls = document.querySelector(".table-controls");

        if (this.stories.length === 0) {
            emptyState.style.display = "block";
            tableContainer.style.display = "none";
            tableControls.style.display = "none";
            return;
        }

        emptyState.style.display = "none";
        tableContainer.style.display = "block";
        tableControls.style.display = "flex";

        tbody.innerHTML = "";

        this.filteredStories.forEach(story => {
            const row = this.createTableRow(story);
            tbody.appendChild(row);
        });

        this.updateSelectionUI();
        this.updateSortIndicators();
    }

    createTableRow(story) {
        const row = document.createElement("tr");
        row.dataset.storyId = story.id;

        const domain = this.extractDomain(story.mainStoryUrl);
        const lastChapterDisplay = story.lastChapterUrl 
            ? `<a href="${story.lastChapterUrl}" target="_blank" class="chapter-link">${story.lastChapterTitle || "Last Chapter"}</a>`
            : "<span class=\"no-chapter\">None</span>";

        const lastGrabbedText = story.dateLastGrabbed 
            ? this.formatDate(story.dateLastGrabbed)
            : "Never";

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="story-checkbox" data-story-id="${story.id}" ${this.selectedStories.has(story.id) ? "checked" : ""}>
            </td>
            <td class="title-col">
                <a href="${story.mainStoryUrl}" target="_blank" class="story-title-link">${story.title}</a>
            </td>
            <td class="domain-col">${domain}</td>
            <td class="chapter-col">${lastChapterDisplay}</td>
            <td class="date-col">${lastGrabbedText}</td>
            <td class="date-col">${this.formatDate(story.dateAdded)}</td>
            <td class="actions-col">
                <button class="edit-btn" data-story-id="${story.id}" title="Edit story">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                    </svg>
                </button>
            </td>
        `;

        // Add event listeners for row
        const checkbox = row.querySelector(".story-checkbox");
        checkbox.addEventListener("change", (e) => {
            this.handleStorySelection(story.id, e.target.checked);
        });

        const editBtn = row.querySelector(".edit-btn");
        editBtn.addEventListener("click", () => {
            this.showEditModal(story);
        });

        return row;
    }

    handleStorySelection(storyId, isSelected) {
        if (isSelected) {
            this.selectedStories.add(storyId);
        } else {
            this.selectedStories.delete(storyId);
        }
        this.updateSelectionUI();
    }

    handleSelectAll(isChecked) {
        const checkboxes = document.querySelectorAll(".story-checkbox");
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            this.handleStorySelection(checkbox.dataset.storyId, isChecked);
        });
    }

    selectAllVisible() {
        this.filteredStories.forEach(story => {
            this.selectedStories.add(story.id);
        });
        this.updateSelectionUI();
        this.renderTable();
    }

    clearSelection() {
        this.selectedStories.clear();
        this.updateSelectionUI();
        this.renderTable();
    }

    updateSelectionUI() {
        const count = this.selectedStories.size;
        document.getElementById("selection-count").textContent = `${count} selected`;
        
        const selectAllCheckbox = document.getElementById("select-all-checkbox");
        const visibleStoryIds = this.filteredStories.map(s => s.id);
        const visibleSelected = visibleStoryIds.filter(id => this.selectedStories.has(id));
        
        if (visibleSelected.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (visibleSelected.length === visibleStoryIds.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }

        // Enable/disable bulk action buttons
        const openChaptersBtn = document.getElementById("open-last-chapters-btn");
        openChaptersBtn.disabled = count === 0;
    }

    async openLastChapters() {
        const selectedStoriesData = this.stories.filter(s => this.selectedStories.has(s.id));
        const chaptersToOpen = selectedStoriesData.filter(s => s.lastChapterUrl);

        if (chaptersToOpen.length === 0) {
            alert("No last chapters to open for selected stories.");
            return;
        }

        if (chaptersToOpen.length > 10) {
            const confirmed = confirm(`This will open ${chaptersToOpen.length} tabs. Continue?`);
            if (!confirmed) return;
        }

        chaptersToOpen.forEach(story => {
            chrome.tabs.create({
                url: story.lastChapterUrl,
                active: false
            });
        });
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

    // Modal and form handling methods
    showAddModal() {
        document.getElementById("add-story-modal").style.display = "flex";
    }

    hideAddModal() {
        document.getElementById("add-story-modal").style.display = "none";
        document.getElementById("add-story-form").reset();
    }

    showEditModal(story) {
        document.getElementById("edit-story-id").value = story.id;
        document.getElementById("edit-story-title").value = story.title;
        document.getElementById("edit-main-story-url").value = story.mainStoryUrl;
        document.getElementById("edit-last-chapter-url").value = story.lastChapterUrl || "";
        document.getElementById("edit-story-modal").style.display = "flex";
    }

    hideEditModal() {
        document.getElementById("edit-story-modal").style.display = "none";
        document.getElementById("edit-story-form").reset();
    }

    async handleAddStory() {
        const title = document.getElementById("story-title").value.trim();
        const mainUrl = document.getElementById("main-story-url").value.trim();
        const lastChapterUrl = document.getElementById("last-chapter-url").value.trim();

        if (!title || !mainUrl) {
            alert("Please fill in all required fields.");
            return;
        }

        const story = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            title,
            mainStoryUrl: mainUrl,
            lastChapterUrl: lastChapterUrl || "",
            lastChapterTitle: "",
            dateLastGrabbed: lastChapterUrl ? new Date().toISOString() : null,
            dateAdded: new Date().toISOString()
        };

        this.stories.push(story);
        await this.saveStories();
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideAddModal();
    }

    async handleEditStory() {
        const id = document.getElementById("edit-story-id").value;
        const title = document.getElementById("edit-story-title").value.trim();
        const mainUrl = document.getElementById("edit-main-story-url").value.trim();
        const lastChapterUrl = document.getElementById("edit-last-chapter-url").value.trim();

        const storyIndex = this.stories.findIndex(s => s.id === id);
        if (storyIndex === -1) return;

        this.stories[storyIndex] = {
            ...this.stories[storyIndex],
            title,
            mainStoryUrl: mainUrl,
            lastChapterUrl
        };

        await this.saveStories();
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideEditModal();
    }

    async handleDeleteStory() {
        const id = document.getElementById("edit-story-id").value;
        const confirmed = confirm("Are you sure you want to delete this story?");
        
        if (!confirmed) return;

        this.stories = this.stories.filter(s => s.id !== id);
        this.selectedStories.delete(id);
        
        await this.saveStories();
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideEditModal();
    }

    async refresh() {
        await this.loadStories();
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
    }
}

// Initialize the story tracker when the page loads
document.addEventListener("DOMContentLoaded", () => {
    new StoryTrackerTable();
});
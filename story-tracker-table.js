// Story Tracker Table - with filtering, sorting, and selection
class StoryTrackerTable {
    constructor() {
        this.stories = [];
        this.filteredStories = [];
        this.selectedStories = new Set();
        this.sortColumn = "dateLastGrabbed";
        this.sortDirection = "desc";
        this.filterText = "";
        this.domainFilter = "";
        this.lastClickedStoryIndex = -1; // Track last clicked story for shift+click selection

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
            // Get all storage data and filter for story entries
            const allData = await chrome.storage.local.get();
            const stories = Object.entries(allData)
                .filter(([key]) => key.startsWith("story_"))
                .map(([, story]) => story);
            
            this.stories = stories;
            this.applyFilters();
        } catch (error) {
            console.error("Error loading stories:", error);
            this.stories = [];
        }
    }

    async saveStory(story) {
        try {
            const key = `story_${story.id}`;
            await chrome.storage.local.set({ [key]: story });
            return true;
        } catch (error) {
            console.error("Error saving story:", error);
            return false;
        }
    }

    async deleteStoryFromStorage(storyId) {
        try {
            const key = `story_${storyId}`;
            await chrome.storage.local.remove(key);
            return true;
        } catch (error) {
            console.error("Error deleting story:", error);
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

        document.getElementById("open-main-stories-btn").addEventListener("click", () => {
            this.openMainStories();
        });

        document.getElementById("manage-tags-btn").addEventListener("click", () => {
            this.showManageTagsModal();
        });

        document.getElementById("auto-grab-chapters-btn").addEventListener("click", () => {
            this.handleAutoGrabNewChapters();
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

        document.getElementById("close-story-modal").addEventListener("click", () => {
            this.hideStoryModal();
        });

        document.getElementById("cancel-story-btn").addEventListener("click", () => {
            this.hideStoryModal();
        });

        // Form submission
        document.getElementById("story-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleStoryFormSubmit();
        });

        document.getElementById("delete-story-btn").addEventListener("click", () => {
            this.handleDeleteStory();
        });

        document.getElementById("refresh-btn").addEventListener("click", () => {
            this.refresh();
        });

        // Import modal controls
        document.getElementById("import-stories-btn").addEventListener("click", () => {
            this.showImportModal();
        });

        // JSON import modal controls
        document.getElementById("import-json-btn").addEventListener("click", () => {
            this.showJsonImportModal();
        });

        // Export stories
        document.getElementById("export-stories-btn").addEventListener("click", () => {
            this.exportStories();
        });

        document.getElementById("close-import-modal").addEventListener("click", () => {
            this.hideImportModal();
        });

        document.getElementById("cancel-import-btn").addEventListener("click", () => {
            this.hideImportModal();
        });

        document.getElementById("import-stories-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleImportStories();
        });

        // Close import modal when clicking outside
        document.getElementById("import-stories-modal").addEventListener("click", (e) => {
            if (e.target.id === "import-stories-modal") this.hideImportModal();
        });

        // JSON import modal controls
        document.getElementById("close-json-modal").addEventListener("click", () => {
            this.hideJsonImportModal();
        });

        document.getElementById("cancel-json-btn").addEventListener("click", () => {
            this.hideJsonImportModal();
        });

        document.getElementById("import-json-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleJsonImport();
        });

        // Close JSON import modal when clicking outside
        document.getElementById("import-json-modal").addEventListener("click", (e) => {
            if (e.target.id === "import-json-modal") this.hideJsonImportModal();
        });

        // Manage tags modal controls
        document.getElementById("close-tags-modal").addEventListener("click", () => {
            this.hideManageTagsModal();
        });

        document.getElementById("cancel-tags-btn").addEventListener("click", () => {
            this.hideManageTagsModal();
        });

        document.getElementById("manage-tags-form").addEventListener("submit", (e) => {
            e.preventDefault();
            this.handleManageTags();
        });

        // Close manage tags modal when clicking outside
        document.getElementById("manage-tags-modal").addEventListener("click", (e) => {
            if (e.target.id === "manage-tags-modal") this.hideManageTagsModal();
        });
    }

    applyFilters() {
        this.filteredStories = this.stories.filter(story => {
            // Text filter
            const matchesText = !this.filterText || 
                story.title.toLowerCase().includes(this.filterText) ||
                story.mainStoryUrl.toLowerCase().includes(this.filterText) ||
                (story.lastChapterTitle && story.lastChapterTitle.toLowerCase().includes(this.filterText)) ||
                (story.tags && story.tags.some(tag => tag.toLowerCase().includes(this.filterText)));

            // Domain filter
            const domain = this.extractDomain(story.mainStoryUrl);
            const matchesDomain = !this.domainFilter || domain === this.domainFilter;

            return matchesText && matchesDomain;
        });

        this.applySorting();
        
        // Reset last clicked index when filters change
        this.lastClickedStoryIndex = -1;
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
            case "tags":
                aValue = (a.tags || []).join(", ").toLowerCase();
                bValue = (b.tags || []).join(", ").toLowerCase();
                break;
            case "dateLastGrabbed":
                aValue = new Date(a.dateLastGrabbed || 0);
                bValue = new Date(b.dateLastGrabbed || 0);
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
        
        // Reset last clicked index when sorting changes
        this.lastClickedStoryIndex = -1;
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

        const tagsDisplay = story.tags && story.tags.length > 0 
            ? story.tags.map(tag => `<span class="tag">${tag}</span>`).join("")
            : "<span class=\"no-tags\">None</span>";

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="story-checkbox" data-story-id="${story.id}" ${this.selectedStories.has(story.id) ? "checked" : ""}>
            </td>
            <td class="title-col">
                <a href="${story.mainStoryUrl}" target="_blank" class="story-title-link">${story.title}</a>
            </td>
            <td class="domain-col">${domain}</td>
            <td class="chapter-col">${lastChapterDisplay}</td>
            <td class="tags-col">${tagsDisplay}</td>
            <td class="date-col">${lastGrabbedText}</td>
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
        checkbox.addEventListener("click", (e) => {
            this.handleStorySelection(story.id, e.target.checked, e);
        });

        const editBtn = row.querySelector(".edit-btn");
        editBtn.addEventListener("click", () => {
            this.showEditModal(story);
        });

        return row;
    }

    handleStorySelection(storyId, isSelected, event = null) {
        const currentStoryIndex = this.filteredStories.findIndex(s => s.id === storyId);
        
        // Handle shift+click for range selection
        if (event && event.shiftKey && this.lastClickedStoryIndex !== -1 && currentStoryIndex !== -1) {
            // Determine the range
            const startIndex = Math.min(this.lastClickedStoryIndex, currentStoryIndex);
            const endIndex = Math.max(this.lastClickedStoryIndex, currentStoryIndex);
            
            // Select/deselect all stories in the range
            for (let i = startIndex; i <= endIndex; i++) {
                const story = this.filteredStories[i];
                if (story) {
                    if (isSelected) {
                        this.selectedStories.add(story.id);
                    } else {
                        this.selectedStories.delete(story.id);
                    }
                    
                    // Update the checkbox in the DOM immediately
                    const checkbox = document.querySelector(`input[data-story-id="${story.id}"]`);
                    if (checkbox) {
                        checkbox.checked = isSelected;
                    }
                }
            }
            
            // Don't update lastClickedStoryIndex for shift+click - keep the original anchor point
        } else {
            // Normal single selection
            if (isSelected) {
                this.selectedStories.add(storyId);
            } else {
                this.selectedStories.delete(storyId);
            }
            
            // Update last clicked index only for normal clicks
            this.lastClickedStoryIndex = currentStoryIndex;
        }
        
        this.updateSelectionUI();
    }

    handleSelectAll(isChecked) {
        const checkboxes = document.querySelectorAll(".story-checkbox");
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
            this.handleStorySelection(checkbox.dataset.storyId, isChecked);
        });
        
        // Reset last clicked index since this is a bulk operation
        this.lastClickedStoryIndex = -1;
    }

    selectAllVisible() {
        this.filteredStories.forEach(story => {
            this.selectedStories.add(story.id);
        });
        this.updateSelectionUI();
        this.renderTable();
        
        // Reset last clicked index since this is a bulk operation
        this.lastClickedStoryIndex = -1;
    }

    clearSelection() {
        this.selectedStories.clear();
        this.updateSelectionUI();
        this.renderTable();
        
        // Reset last clicked index since this clears everything
        this.lastClickedStoryIndex = -1;
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
        const openMainBtn = document.getElementById("open-main-stories-btn");
        const autoGrabBtn = document.getElementById("auto-grab-chapters-btn");
        const manageTagsBtn = document.getElementById("manage-tags-btn");
        openChaptersBtn.disabled = count === 0;
        openMainBtn.disabled = count === 0;
        autoGrabBtn.disabled = count === 0;
        manageTagsBtn.disabled = count === 0;
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

    async openMainStories() {
        const selectedStoriesData = this.stories.filter(s => this.selectedStories.has(s.id));
        
        if (selectedStoriesData.length === 0) {
            alert("No stories selected.");
            return;
        }

        if (selectedStoriesData.length > 10) {
            const confirmed = confirm(`This will open ${selectedStoriesData.length} tabs. Continue?`);
            if (!confirmed) return;
        }

        selectedStoriesData.forEach(story => {
            chrome.tabs.create({
                url: story.mainStoryUrl,
                active: false
            });
        });
    }

    // Format date for display
    formatDate(isoString) {
        const date = new Date(isoString);
        const now = new Date();
        
        // Compare calendar dates, not 24-hour periods
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const dateDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // For recent dates, show relative time with actual time
        if (dateDay.getTime() === today.getTime()) {
            const timeString = date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit", hour12: true });
            return `Today at ${timeString}`;
        }
        if (dateDay.getTime() === yesterday.getTime()) {
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
        this.isEditMode = false;
        document.getElementById("story-modal-title").textContent = "Add New Story";
        document.getElementById("submit-story-btn").textContent = "Add Story";
        document.getElementById("delete-story-btn").style.display = "none";
        document.getElementById("story-form").reset();
        document.getElementById("story-modal").style.display = "flex";
    }

    showEditModal(story) {
        this.isEditMode = true;
        document.getElementById("story-modal-title").textContent = "Edit Story";
        document.getElementById("submit-story-btn").textContent = "Save Changes";
        document.getElementById("delete-story-btn").style.display = "inline-block";
        
        document.getElementById("story-id").value = story.id;
        document.getElementById("story-title").value = story.title;
        document.getElementById("main-story-url").value = story.mainStoryUrl;
        document.getElementById("last-chapter-url").value = story.lastChapterUrl || "";
        document.getElementById("last-chapter-title").value = story.lastChapterTitle || "";
        document.getElementById("secondary-url-matches").value = (story.secondaryUrlMatches || []).join(", ");
        document.getElementById("story-tags").value = (story.tags || []).join(", ");
        document.getElementById("story-modal").style.display = "flex";
    }

    hideStoryModal() {
        document.getElementById("story-modal").style.display = "none";
        document.getElementById("story-form").reset();
    }

    async handleStoryFormSubmit() {
        if (this.isEditMode) {
            await this.handleEditStory();
        } else {
            await this.handleAddStory();
        }
    }

    async handleAddStory() {
        const title = document.getElementById("story-title").value.trim();
        const mainUrl = document.getElementById("main-story-url").value.trim();
        const lastChapterUrl = document.getElementById("last-chapter-url").value.trim();
        const lastChapterTitle = document.getElementById("last-chapter-title").value.trim();
        const secondaryUrlMatchesInput = document.getElementById("secondary-url-matches").value.trim();
        const tagsInput = document.getElementById("story-tags").value.trim();

        if (!title || !mainUrl) {
            alert("Please fill in all required fields.");
            return;
        }

        // Parse tags and secondary URL matches from comma-separated input
        const tags = tagsInput ? tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag) : [];
        const secondaryUrlMatches = secondaryUrlMatchesInput ? 
            secondaryUrlMatchesInput.split(",").map(url => url.trim()).filter(url => url) : [];

        const story = {
            id: Date.now().toString(36) + Math.random().toString(36).substr(2),
            title,
            mainStoryUrl: mainUrl,
            lastChapterUrl: lastChapterUrl || "",
            lastChapterTitle: lastChapterTitle || "",
            secondaryUrlMatches,
            tags,
            dateLastGrabbed: lastChapterUrl ? new Date().toISOString() : null,
            dateAdded: new Date().toISOString()
        };

        this.stories.push(story);
        await this.saveStory(story);
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideStoryModal();
    }

    async handleEditStory() {
        const id = document.getElementById("story-id").value;
        const title = document.getElementById("story-title").value.trim();
        const mainUrl = document.getElementById("main-story-url").value.trim();
        const lastChapterUrl = document.getElementById("last-chapter-url").value.trim();
        const lastChapterTitle = document.getElementById("last-chapter-title").value.trim();
        const secondaryUrlMatchesInput = document.getElementById("secondary-url-matches").value.trim();
        const tagsInput = document.getElementById("story-tags").value.trim();

        const storyIndex = this.stories.findIndex(s => s.id === id);
        if (storyIndex === -1) return;

        // Parse tags from comma-separated input
        const tags = tagsInput ? tagsInput.split(",").map(tag => tag.trim()).filter(tag => tag) : [];
        
        // Parse secondary URL matches from comma-separated input
        const secondaryUrlMatches = secondaryUrlMatchesInput ? 
            secondaryUrlMatchesInput.split(",").map(url => url.trim()).filter(url => url) : [];

        this.stories[storyIndex] = {
            ...this.stories[storyIndex],
            title,
            mainStoryUrl: mainUrl,
            lastChapterUrl,
            lastChapterTitle,
            secondaryUrlMatches,
            tags
        };

        await this.saveStory(this.stories[storyIndex]);
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideStoryModal();
    }

    async handleDeleteStory() {
        const id = document.getElementById("story-id").value;
        const confirmed = confirm("Are you sure you want to delete this story?");
        
        if (!confirmed) return;

        this.stories = this.stories.filter(s => s.id !== id);
        this.selectedStories.delete(id);
        
        await this.deleteStoryFromStorage(id);
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideStoryModal();
    }

    // Import modal management
    showImportModal() {
        document.getElementById("import-stories-modal").style.display = "flex";
        document.getElementById("import-links").focus();
    }

    hideImportModal() {
        document.getElementById("import-stories-modal").style.display = "none";
        document.getElementById("import-stories-form").reset();
    }

    // Parse HTML links and extract href and title
    parseHtmlLinks(htmlString) {
        const tempDiv = document.createElement("div");
        tempDiv.innerHTML = htmlString;
        const links = tempDiv.querySelectorAll("a[href]");
        
        return Array.from(links).map(link => ({
            url: link.href,
            title: link.textContent.trim() || link.href
        })).filter(item => item.url && item.title);
    }

    async handleImportStories() {
        const htmlInput = document.getElementById("import-links").value.trim();
        
        if (!htmlInput) {
            alert("Please paste HTML links to import.");
            return;
        }

        try {
            const parsedLinks = this.parseHtmlLinks(htmlInput);
            
            if (parsedLinks.length === 0) {
                alert("No valid links found. Please make sure you're pasting HTML anchor tags like:\n<a href=\"https://example.com/story\">Story Title</a>");
                return;
            }

            const confirmMessage = `Found ${parsedLinks.length} links. Import these as new stories?`;
            if (!confirm(confirmMessage)) {
                return;
            }

            let importedCount = 0;
            const existingUrls = new Set(this.stories.map(s => s.mainStoryUrl));

            for (const link of parsedLinks) {
                // Skip if story with this URL already exists
                if (existingUrls.has(link.url)) {
                    continue;
                }

                const story = {
                    id: Date.now().toString(36) + Math.random().toString(36).substr(2),
                    title: link.title,
                    mainStoryUrl: link.url,
                    lastChapterUrl: "",
                    lastChapterTitle: "",
                    secondaryUrlMatches: [],
                    tags: [],
                    dateLastGrabbed: null,
                    dateAdded: new Date().toISOString()
                };

                this.stories.push(story);
                existingUrls.add(link.url);
                importedCount++;
            }

            if (importedCount > 0) {
                // Save each imported story individually
                for (const story of this.stories.slice(-importedCount)) {
                    await this.saveStory(story);
                }
                this.populateDomainFilter();
                this.applyFilters();
                this.renderTable();
                this.hideImportModal();
                
                const skipped = parsedLinks.length - importedCount;
                let message = `Successfully imported ${importedCount} new stories.`;
                if (skipped > 0) {
                    message += ` Skipped ${skipped} duplicates.`;
                }
                alert(message);
            } else {
                alert("No new stories to import. All links already exist in your tracker.");
            }
        } catch (error) {
            console.error("Error importing stories:", error);
            alert("Error importing stories. Please check the format and try again.");
        }
    }

    // Export stories as JSON
    exportStories() {
        if (this.stories.length === 0) {
            alert("No stories to export.");
            return;
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            storiesCount: this.stories.length,
            stories: this.stories
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
        const filename = `grabby-stories-backup-${currentDate}.json`;

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`Exported ${this.stories.length} stories to ${filename}`);
    }

    // JSON import modal management
    showJsonImportModal() {
        document.getElementById("import-json-modal").style.display = "flex";
    }

    hideJsonImportModal() {
        document.getElementById("import-json-modal").style.display = "none";
        document.getElementById("import-json-form").reset();
    }

    // Handle JSON file import
    async handleJsonImport() {
        const fileInput = document.getElementById("json-file");
        const file = fileInput.files[0];
        
        if (!file) {
            alert("Please select a JSON file to import.");
            return;
        }

        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            // Validate the backup format
            if (!data.stories || !Array.isArray(data.stories)) {
                alert("Invalid backup file format. Expected a 'stories' array.");
                return;
            }

            const confirmMessage = `Found ${data.stories.length} stories in backup. Import these stories?\n\nNote: Existing stories with the same URLs will be skipped.`;
            if (!confirm(confirmMessage)) {
                return;
            }

            let importedCount = 0;
            const existingUrls = new Set(this.stories.map(s => s.mainStoryUrl));

            for (const storyData of data.stories) {
                // Skip if story with this URL already exists
                if (existingUrls.has(storyData.mainStoryUrl)) {
                    continue;
                }

                // Ensure the story has an ID
                if (!storyData.id) {
                    storyData.id = Date.now().toString(36) + Math.random().toString(36).substr(2);
                }

                // Add to local array and save individually
                this.stories.push(storyData);
                await this.saveStory(storyData);
                existingUrls.add(storyData.mainStoryUrl);
                importedCount++;
            }

            if (importedCount > 0) {
                this.populateDomainFilter();
                this.applyFilters();
                this.renderTable();
                this.hideJsonImportModal();
                
                const skipped = data.stories.length - importedCount;
                let message = `Successfully imported ${importedCount} stories from JSON backup.`;
                if (skipped > 0) {
                    message += ` Skipped ${skipped} duplicates.`;
                }
                alert(message);
            } else {
                alert("No new stories to import. All stories in the backup already exist.");
            }
        } catch (error) {
            console.error("Error importing JSON:", error);
            alert("Error reading JSON file. Please check the file format and try again.");
        }
    }

    // Manage tags modal management
    showManageTagsModal() {
        const selectedCount = this.selectedStories.size;
        if (selectedCount === 0) {
            alert("Please select at least one story.");
            return;
        }
        
        // Update modal title with count
        document.querySelector("#manage-tags-modal h2").textContent = 
            `Manage Tags for ${selectedCount} Selected Stories`;
        
        document.getElementById("manage-tags-modal").style.display = "flex";
        document.getElementById("tags-to-add").focus();
    }

    hideManageTagsModal() {
        document.getElementById("manage-tags-modal").style.display = "none";
        document.getElementById("manage-tags-form").reset();
    }

    // Handle bulk tag management
    async handleManageTags() {
        const tagsToAddInput = document.getElementById("tags-to-add").value.trim();
        const tagsToRemoveInput = document.getElementById("tags-to-remove").value.trim();
        
        if (!tagsToAddInput && !tagsToRemoveInput) {
            alert("Please specify tags to add or remove.");
            return;
        }

        // Parse tags from comma-separated input
        const tagsToAdd = tagsToAddInput ? 
            tagsToAddInput.split(",").map(tag => tag.trim()).filter(tag => tag) : [];
        const tagsToRemove = tagsToRemoveInput ? 
            tagsToRemoveInput.split(",").map(tag => tag.trim()).filter(tag => tag) : [];

        const selectedStoriesData = this.stories.filter(s => this.selectedStories.has(s.id));
        
        let updatedCount = 0;
        
        for (const story of selectedStoriesData) {
            let storyUpdated = false;
            const currentTags = story.tags || [];
            let newTags = [...currentTags];
            
            // Add tags (skip if already exists)
            for (const tagToAdd of tagsToAdd) {
                if (!newTags.includes(tagToAdd)) {
                    newTags.push(tagToAdd);
                    storyUpdated = true;
                }
            }
            
            // Remove tags (skip if doesn't exist)
            for (const tagToRemove of tagsToRemove) {
                const index = newTags.indexOf(tagToRemove);
                if (index !== -1) {
                    newTags.splice(index, 1);
                    storyUpdated = true;
                }
            }
            
            // Update story if changes were made
            if (storyUpdated) {
                story.tags = newTags;
                await this.saveStory(story);
                
                // Update the story in the local array
                const storyIndex = this.stories.findIndex(s => s.id === story.id);
                if (storyIndex !== -1) {
                    this.stories[storyIndex] = story;
                }
                
                updatedCount++;
            }
        }
        
        if (updatedCount > 0) {
            this.applyFilters();
            this.renderTable();
            this.hideManageTagsModal();
        } else {
            alert("No stories were updated. All selected stories already have the specified tag state.");
        }
    }

    // Handle auto grab new chapters for selected stories
    async handleAutoGrabNewChapters() {
        const selectedStoriesData = this.stories.filter(s => this.selectedStories.has(s.id));
        
        if (selectedStoriesData.length === 0) {
            alert("Please select at least one story.");
            return;
        }

        // Filter stories that have last chapters and are from supported sites
        const eligibleStories = selectedStoriesData.filter(story => {
            if (!story.lastChapterUrl) {
                return false;
            }
            
            // Check if the domain supports auto-grab using WEBSITE_CONFIGS
            try {
                const config = findMatchingConfig(story.lastChapterUrl);
                return config?.autoGrab?.enabled === true;
            } catch {
                return false;
            }
        });

        if (eligibleStories.length === 0) {
            alert("No selected stories are eligible for auto-grab. Stories need:\n• A saved last chapter URL\n• Be from a site with auto-grab enabled in config");
            return;
        }

        // Start auto-grab for each eligible story
        for (const story of eligibleStories) {
            try {
                console.log(`Starting auto-grab for: ${story.title}`);
                
                // Send message to background to start auto-grab for this story
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "startAutoGrab",
                    storyId: story.id,
                    storyTitle: story.title,
                    lastChapterUrl: story.lastChapterUrl
                });
                
                // Small delay between starting each story to avoid overwhelming
                await new Promise(resolve => setTimeout(resolve, 1000));
            } catch (error) {
                console.error(`Error starting auto-grab for ${story.title}:`, error);
            }
        }
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
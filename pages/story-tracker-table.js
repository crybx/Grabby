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
        this.tagFilter = ""; // Active tag filter
        this.lastClickedStoryIndex = -1; // Track last clicked story for shift+click selection
        this.filterDebounceTimer = null; // Timer for debouncing filter input
        
        // Pagination settings
        this.currentPage = 1;
        this.storiesPerPage = 50;

        this.init();
    }

    async init() {
        await this.loadStories();
        this.setupEventListeners();
        this.populateDomainFilter();
        this.renderTable();
        this.updateTagFilterDisplay();
    }

    async loadStories() {
        try {
            this.stories = await StoryTracker.getAllStories();
            this.applyFilters();
            this.updateTotalCount();
        } catch (error) {
            console.error("Error loading stories:", error);
            this.stories = [];
            this.updateTotalCount();
        }
    }

    setupEventListeners() {
        // Filter input with debouncing
        document.getElementById("filter-input").addEventListener("input", (e) => {
            const newFilterText = e.target.value.toLowerCase();
            
            // Clear existing timer
            if (this.filterDebounceTimer) {
                clearTimeout(this.filterDebounceTimer);
            }
            
            // Set new timer for 200ms delay
            this.filterDebounceTimer = setTimeout(() => {
                this.filterText = newFilterText;
                this.applyFilters();
                this.renderTable();
            }, 200);
        });

        // Queue control event listeners
        document.getElementById("pause-queue-btn").addEventListener("click", () => {
            this.pauseQueue();
        });

        document.getElementById("resume-queue-btn").addEventListener("click", () => {
            this.resumeQueue();
        });

        document.getElementById("cancel-queue-btn").addEventListener("click", () => {
            this.cancelQueue();
        });

        document.getElementById("close-queue-btn").addEventListener("click", () => {
            this.closeQueueProgress();
        });

        // Add message listener for queue progress updates
        chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
            if (message.type === "queueUpdate") {
                this.handleQueueProgressUpdate(message.status);
            }
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

        document.getElementById("grab-chapters-btn").addEventListener("click", () => {
            this.handleAutoGrabNewChapters();
        });

        document.getElementById("delete-selected-btn").addEventListener("click", () => {
            this.deleteSelectedStories();
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

        // Clear tag filter button
        document.getElementById("clear-tag-filter").addEventListener("click", () => {
            this.clearTagFilter();
        });

        // Clear all filters button
        document.getElementById("clear-filters-btn").addEventListener("click", () => {
            this.clearAllFilters();
        });

        // Make active tag clickable to clear
        document.getElementById("active-tag-name").addEventListener("click", () => {
            this.clearTagFilter();
        });
        
        // Pagination controls
        document.getElementById("first-page-btn").addEventListener("click", () => {
            this.goToPage(1);
        });
        
        document.getElementById("prev-page-btn").addEventListener("click", () => {
            this.goToPage(this.currentPage - 1);
        });
        
        document.getElementById("next-page-btn").addEventListener("click", () => {
            this.goToPage(this.currentPage + 1);
        });
        
        document.getElementById("last-page-btn").addEventListener("click", () => {
            const totalPages = Math.ceil(this.filteredStories.length / this.storiesPerPage);
            this.goToPage(totalPages);
        });
        
        // Stories per page selector
        document.getElementById("stories-per-page-select").addEventListener("change", (e) => {
            this.changeStoriesPerPage(parseInt(e.target.value));
        });

        // Import modal controls
        document.getElementById("import-stories-btn").addEventListener("click", () => {
            this.showImportModal();
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

        // Clear error when user interacts with inputs
        document.getElementById("import-links").addEventListener("input", () => {
            this.hideImportError();
        });

        document.getElementById("json-file").addEventListener("change", (e) => {
            this.hideImportError();
            this.updateClearJsonButton();
        });
        
        document.getElementById("clear-json-btn").addEventListener("click", () => {
            this.clearJsonFiles();
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

            // Domain filter - strip "(Active Tab)" suffix for comparison
            const domain = story.domain || this.extractDomain(story.mainStoryUrl);
            const filterDomain = this.domainFilter.replace(" (Active Tab)", "");
            const matchesDomain = !this.domainFilter || domain === filterDomain;

            // Tag filter
            const matchesTag = !this.tagFilter || 
                (story.tags && story.tags.some(tag => tag.toLowerCase() === this.tagFilter.toLowerCase()));

            return matchesText && matchesDomain && matchesTag;
        });

        this.applySorting();
        
        // Reset to first page when filters change
        this.currentPage = 1;
        
        // Reset last clicked index when filters change
        this.lastClickedStoryIndex = -1;
    }

    filterByTag(tagName) {
        // Toggle tag filter - if same tag is clicked, clear the filter
        if (this.tagFilter === tagName) {
            this.tagFilter = "";
        } else {
            this.tagFilter = tagName;
        }
        
        this.applyFilters();
        this.renderTable();
        this.updateTagFilterDisplay();
    }

    clearTagFilter() {
        this.tagFilter = "";
        this.applyFilters();
        this.renderTable();
        this.updateTagFilterDisplay();
    }

    clearAllFilters() {
        // Clear text filter
        this.filterText = "";
        document.getElementById("filter-input").value = "";
        
        // Clear domain filter
        this.domainFilter = "";
        document.getElementById("domain-filter").value = "";
        
        // Clear tag filter
        this.tagFilter = "";
        
        // Apply changes
        this.applyFilters();
        this.renderTable();
        this.updateTagFilterDisplay();
    }

    updateTagFilterDisplay() {
        const activeTagFilter = document.getElementById("active-tag-filter");
        const activeTagName = document.getElementById("active-tag-name");
        
        if (this.tagFilter) {
            activeTagFilter.style.display = "flex";
            activeTagName.textContent = this.tagFilter;
        } else {
            activeTagFilter.style.display = "none";
        }
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
                    aValue = a.domain || this.extractDomain(a.mainStoryUrl);
                    bValue = b.domain || this.extractDomain(b.mainStoryUrl);
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
                case "dateLastChecked":
                    aValue = new Date(a.dateLastChecked || 0);
                    bValue = new Date(b.dateLastChecked || 0);
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
        // Get unique domains using stored field or fallback
        const uniqueDomains = [...new Set(this.stories.map(story => 
            story.domain || this.extractDomain(story.mainStoryUrl)
        ))];
        
        // Add Active Tab suffix where needed (check once per unique domain)
        const domains = uniqueDomains.map(domain => {
            try {
                // Check if this domain requires active tab
                const config = findMatchingConfig(domain);
                if (config?.autoNav?.activeTab === true) {
                    return `${domain} (Active Tab)`;
                }
            } catch {
                // If error getting config, just return domain
            }
            return domain;
        });
        
        domains.sort();

        const select = document.getElementById("domain-filter");
        const currentValue = select.value; // Preserve current selection
        select.innerHTML = "<option value=\"\">All Domains</option>";

        domains.forEach(domain => {
            const option = document.createElement("option");
            option.value = domain;
            option.textContent = domain;
            select.appendChild(option);
        });
        
        // Restore the previously selected domain if it still exists
        if (currentValue && domains.includes(currentValue)) {
            select.value = currentValue;
        } else if (currentValue === "") {
            select.value = ""; // Keep "All Domains" selected
        }
    }

    extractDomain(url) {
        try {
            return new URL(url).hostname;
        } catch {
            return "unknown";
        }
    }

    renderTable() {
        // Use requestAnimationFrame to optimize rendering
        requestAnimationFrame(() => {
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

            // Calculate pagination
            const startIndex = (this.currentPage - 1) * this.storiesPerPage;
            const endIndex = startIndex + this.storiesPerPage;
            const pageStories = this.filteredStories.slice(startIndex, endIndex);

            // Use DocumentFragment for batch DOM insertion
            const fragment = document.createDocumentFragment();
            pageStories.forEach(story => {
                const row = this.createTableRow(story);
                fragment.appendChild(row);
            });
            tbody.appendChild(fragment);

            this.updateSelectionUI();
            this.updateSortIndicators();
            this.updateTotalCount();
            this.updatePaginationControls();
        });
    }

    createTableRow(story) {
        const row = document.createElement("tr");
        row.dataset.storyId = story.id;

        const domain = story.domain || this.extractDomain(story.mainStoryUrl);
        const lastChapterDisplay = story.lastChapterUrl 
            ? `<a href="${story.lastChapterUrl}" target="_blank" class="chapter-link">${story.lastChapterTitle || "Last Chapter"}</a>`
            : "<span class=\"no-chapter\">None</span>";

        const lastGrabbedText = story.dateLastGrabbed 
            ? this.formatDate(story.dateLastGrabbed)
            : "Never";

        const lastCheckedText = story.dateLastChecked 
            ? this.formatDate(story.dateLastChecked)
            : "Never";

        const lastCheckStatus = story.lastCheckStatus || "Unknown";

        const tagsDisplay = story.tags && story.tags.length > 0 
            ? story.tags.map(tag => {
                const isActive = this.tagFilter && tag.toLowerCase() === this.tagFilter.toLowerCase();
                const activeClass = isActive ? " active" : "";
                return `<span class="tag clickable-tag${activeClass}" data-tag="${tag}">${tag}</span>`;
            }).join("")
            : "<span class=\"no-tags\">None</span>";

        row.innerHTML = `
            <td class="checkbox-col">
                <input type="checkbox" class="story-checkbox" data-story-id="${story.id}" ${this.selectedStories.has(story.id) ? "checked" : ""}>
            </td>
            <td class="title-col">
                <a href="${story.mainStoryUrl}" target="_blank" class="story-title-link">${story.title}</a>
            </td>
            <td class="domain-col" title="${domain}">${domain}</td>
            <td class="chapter-col">${lastChapterDisplay}</td>
            <td class="tags-col">${tagsDisplay}</td>
            <td class="date-col">${lastGrabbedText}</td>
            <td class="date-col" title="${lastCheckStatus}">${lastCheckedText}</td>
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

        // Add event listeners for clickable tags
        const clickableTags = row.querySelectorAll(".clickable-tag");
        clickableTags.forEach(tagElement => {
            tagElement.addEventListener("click", (e) => {
                e.preventDefault();
                const tagName = e.target.dataset.tag;
                this.filterByTag(tagName);
            });
        });

        return row;
    }

    handleStorySelection(storyId, isSelected, event = null) {
        const currentStoryIndex = this.filteredStories.findIndex(s => s.id === storyId);
        
        // Handle shift+click for range selection (works across pages)
        if (event && event.shiftKey && this.lastClickedStoryIndex !== -1 && currentStoryIndex !== -1) {
            // Determine the range
            const startIndex = Math.min(this.lastClickedStoryIndex, currentStoryIndex);
            const endIndex = Math.max(this.lastClickedStoryIndex, currentStoryIndex);
            
            // Select/deselect all stories in the range (even those not on current page)
            for (let i = startIndex; i <= endIndex; i++) {
                const story = this.filteredStories[i];
                if (story) {
                    if (isSelected) {
                        this.selectedStories.add(story.id);
                    } else {
                        this.selectedStories.delete(story.id);
                    }
                    
                    // Update the checkbox in the DOM if it's visible on current page
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
        // Update the visual checkboxes on current page
        const checkboxes = document.querySelectorAll(".story-checkbox");
        checkboxes.forEach(checkbox => {
            checkbox.checked = isChecked;
        });
        
        // But actually select/deselect ALL filtered stories (across all pages)
        if (isChecked) {
            // Add all filtered stories to selection
            this.filteredStories.forEach(story => {
                this.selectedStories.add(story.id);
            });
        } else {
            // Remove all filtered stories from selection
            this.filteredStories.forEach(story => {
                this.selectedStories.delete(story.id);
            });
        }
        
        this.updateSelectionUI();
        
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
        // Check against ALL filtered stories, not just current page
        const allFilteredIds = this.filteredStories.map(s => s.id);
        const allFilteredSelected = allFilteredIds.filter(id => this.selectedStories.has(id));
        
        if (allFilteredSelected.length === 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        } else if (allFilteredSelected.length === allFilteredIds.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        }

        // Enable/disable bulk action buttons
        const openChaptersBtn = document.getElementById("open-last-chapters-btn");
        const openMainBtn = document.getElementById("open-main-stories-btn");
        const grabChaptersBtn = document.getElementById("grab-chapters-btn");
        const manageTagsBtn = document.getElementById("manage-tags-btn");
        const deleteSelectedBtn = document.getElementById("delete-selected-btn");
        openChaptersBtn.disabled = count === 0;
        openMainBtn.disabled = count === 0;
        manageTagsBtn.disabled = count === 0;
        deleteSelectedBtn.disabled = count === 0;
        
        // Check if queue is active to handle Auto Grab button specially
        const queueProgress = document.getElementById("queue-progress");
        if (queueProgress && queueProgress.style.display === "block") {
            // Queue is active, use special handling for Auto Grab button
            this.updateAutoGrabButtonForActiveQueue();
        } else {
            // No queue active, normal behavior
            grabChaptersBtn.disabled = count === 0;
            grabChaptersBtn.textContent = "Grab New Chapters";
        }
    }

    updateTotalCount() {
        const totalCount = this.stories.length;
        const filteredCount = this.filteredStories.length;
        
        // Check if any filters are active
        const hasFilters = this.filterText || this.domainFilter || this.tagFilter;
        
        let countText;
        if (hasFilters && filteredCount !== totalCount) {
            // Show filtered count when filters are active and results are different
            if (filteredCount === 1) {
                countText = totalCount === 1 ? "1 of 1 story" : `1 of ${totalCount} stories`;
            } else {
                countText = totalCount === 1 ? `${filteredCount} of 1 story` : `${filteredCount} of ${totalCount} stories`;
            }
        } else {
            // Show simple count when no filters or filters show all results
            countText = totalCount === 1 ? "1 story" : `${totalCount} stories`;
        }
        
        document.getElementById("total-stories-count").textContent = countText;
    }

    updatePaginationControls() {
        const totalPages = Math.ceil(this.filteredStories.length / this.storiesPerPage);
        const paginationControls = document.getElementById("pagination-controls");
        
        // Show/hide pagination controls
        if (totalPages <= 1) {
            paginationControls.style.display = "none";
            return;
        }
        
        paginationControls.style.display = "flex";
        
        // Update info text
        const startIndex = (this.currentPage - 1) * this.storiesPerPage + 1;
        const endIndex = Math.min(this.currentPage * this.storiesPerPage, this.filteredStories.length);
        document.getElementById("pagination-info-text").textContent = 
            `Showing ${startIndex}-${endIndex} of ${this.filteredStories.length}`;
        
        // Update button states
        document.getElementById("first-page-btn").disabled = this.currentPage === 1;
        document.getElementById("prev-page-btn").disabled = this.currentPage === 1;
        document.getElementById("next-page-btn").disabled = this.currentPage === totalPages;
        document.getElementById("last-page-btn").disabled = this.currentPage === totalPages;
        
        // Generate page numbers
        this.renderPageNumbers(totalPages);
    }
    
    renderPageNumbers(totalPages) {
        const pageNumbersContainer = document.getElementById("page-numbers");
        pageNumbersContainer.innerHTML = "";
        
        // Show max 5 page numbers with ellipsis
        const maxVisible = 5;
        const halfVisible = Math.floor(maxVisible / 2);
        
        let startPage = Math.max(1, this.currentPage - halfVisible);
        let endPage = Math.min(totalPages, startPage + maxVisible - 1);
        
        // Adjust start if we're near the end
        if (endPage - startPage < maxVisible - 1) {
            startPage = Math.max(1, endPage - maxVisible + 1);
        }
        
        // First page and ellipsis
        if (startPage > 1) {
            this.addPageNumber(1);
            if (startPage > 2) {
                const ellipsis = document.createElement("span");
                ellipsis.className = "page-ellipsis";
                ellipsis.textContent = "...";
                pageNumbersContainer.appendChild(ellipsis);
            }
        }
        
        // Page numbers
        for (let i = startPage; i <= endPage; i++) {
            this.addPageNumber(i);
        }
        
        // Last page and ellipsis
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                const ellipsis = document.createElement("span");
                ellipsis.className = "page-ellipsis";
                ellipsis.textContent = "...";
                pageNumbersContainer.appendChild(ellipsis);
            }
            this.addPageNumber(totalPages);
        }
    }
    
    addPageNumber(pageNum) {
        const pageNumbersContainer = document.getElementById("page-numbers");
        const pageBtn = document.createElement("button");
        pageBtn.className = "page-number";
        pageBtn.textContent = pageNum;
        
        if (pageNum === this.currentPage) {
            pageBtn.classList.add("active");
        } else {
            pageBtn.addEventListener("click", () => this.goToPage(pageNum));
        }
        
        pageNumbersContainer.appendChild(pageBtn);
    }
    
    goToPage(pageNum) {
        const totalPages = Math.ceil(this.filteredStories.length / this.storiesPerPage);
        if (pageNum < 1 || pageNum > totalPages) return;
        
        this.currentPage = pageNum;
        this.renderTable();
    }
    
    changeStoriesPerPage(newStoriesPerPage) {
        // Calculate what story index the user is currently looking at
        const currentStoryIndex = (this.currentPage - 1) * this.storiesPerPage;
        
        // Update the stories per page
        this.storiesPerPage = newStoriesPerPage;
        
        // Calculate what page the current story index should be on with the new page size
        this.currentPage = Math.floor(currentStoryIndex / this.storiesPerPage) + 1;
        
        // Make sure we don't exceed total pages
        const totalPages = Math.ceil(this.filteredStories.length / this.storiesPerPage);
        if (this.currentPage > totalPages) {
            this.currentPage = Math.max(1, totalPages);
        }
        
        this.renderTable();
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

    async deleteSelectedStories() {
        const selectedCount = this.selectedStories.size;
        
        if (selectedCount === 0) {
            alert("No stories selected.");
            return;
        }

        const confirmMessage = selectedCount === 1 
            ? "Are you sure you want to delete the selected story?"
            : `Are you sure you want to delete ${selectedCount} selected stories?`;
        
        const confirmed = confirm(confirmMessage);
        if (!confirmed) return;

        // Delete each selected story
        for (const storyId of this.selectedStories) {
            await StoryTracker.deleteStory(storyId);
            this.stories = this.stories.filter(s => s.id !== storyId);
        }

        // Clear selection after deletion
        this.selectedStories.clear();
        
        // Update UI
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        
        const successMessage = selectedCount === 1 
            ? "1 story deleted successfully."
            : `${selectedCount} stories deleted successfully.`;
        console.log(successMessage);
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
        
        // Hide date fields for add mode
        const editOnlyElements = document.querySelectorAll(".edit-only");
        editOnlyElements.forEach(el => el.style.display = "none");
        
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
        
        // Show and populate date fields for edit mode
        const editOnlyElements = document.querySelectorAll(".edit-only");
        editOnlyElements.forEach(el => el.style.display = "block");
        
        // Convert dates to datetime-local format if they exist
        if (story.dateLastGrabbed) {
            const date = new Date(story.dateLastGrabbed);
            // Convert to local time for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            document.getElementById("date-last-grabbed").value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        if (story.dateLastChecked) {
            const date = new Date(story.dateLastChecked);
            // Convert to local time for datetime-local input
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, "0");
            const day = String(date.getDate()).padStart(2, "0");
            const hours = String(date.getHours()).padStart(2, "0");
            const minutes = String(date.getMinutes()).padStart(2, "0");
            document.getElementById("date-last-checked").value = `${year}-${month}-${day}T${hours}:${minutes}`;
        }
        
        document.getElementById("story-modal").style.display = "flex";
    }

    hideStoryModal() {
        document.getElementById("story-modal").style.display = "none";
        document.getElementById("story-form").reset();
        
        // Hide date fields when closing modal
        const editOnlyElements = document.querySelectorAll(".edit-only");
        editOnlyElements.forEach(el => el.style.display = "none");
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
            title,
            mainStoryUrl: mainUrl,
            domain: this.extractDomain(mainUrl),
            lastChapterUrl: lastChapterUrl || "",
            lastChapterTitle: lastChapterTitle || "",
            secondaryUrlMatches,
            tags,
            dateLastGrabbed: lastChapterUrl ? new Date().toISOString() : null,
            dateAdded: new Date().toISOString()
        };

        this.stories.push(story);
        await StoryTracker.saveStory(story);
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

        // Get the manually set dates
        const dateLastGrabbedInput = document.getElementById("date-last-grabbed").value;
        const dateLastCheckedInput = document.getElementById("date-last-checked").value;

        const updatedStory = {
            ...this.stories[storyIndex],
            title,
            mainStoryUrl: mainUrl,
            domain: this.extractDomain(mainUrl),
            lastChapterUrl,
            lastChapterTitle,
            secondaryUrlMatches,
            tags
        };

        // Update dates only if they were manually set
        if (dateLastGrabbedInput) {
            updatedStory.dateLastGrabbed = new Date(dateLastGrabbedInput).toISOString();
        }
        if (dateLastCheckedInput) {
            updatedStory.dateLastChecked = new Date(dateLastCheckedInput).toISOString();
        }

        this.stories[storyIndex] = updatedStory;

        await StoryTracker.saveStory(this.stories[storyIndex]);
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
        this.hideStoryModal();
    }

    async handleDeleteStory() {
        const id = document.getElementById("story-id").value;
        const confirmed = confirm("Are you sure you want to delete this story?");
        
        if (!confirmed) return;

        await StoryTracker.deleteStory(id);
        this.stories = this.stories.filter(s => s.id !== id);
        this.selectedStories.delete(id);
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
        this.hideImportError();
        this.updateClearJsonButton(); // Hide clear button when modal closes
    }
    
    showImportError(message) {
        const errorElement = document.getElementById("import-error");
        errorElement.textContent = message;
        errorElement.style.display = "block";
    }
    
    hideImportError() {
        const errorElement = document.getElementById("import-error");
        errorElement.style.display = "none";
    }
    
    updateClearJsonButton() {
        const fileInput = document.getElementById("json-file");
        const clearButton = document.getElementById("clear-json-btn");
        
        if (fileInput.files.length > 0) {
            clearButton.style.display = "block";
        } else {
            clearButton.style.display = "none";
        }
    }
    
    clearJsonFiles() {
        const fileInput = document.getElementById("json-file");
        fileInput.value = "";
        this.updateClearJsonButton();
        this.hideImportError();
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
        const jsonFiles = document.getElementById("json-file").files;
        
        if (!htmlInput && jsonFiles.length === 0) {
            this.showImportError("Please either paste HTML links or select JSON files to import.");
            return;
        }
        
        // If both are provided, show error
        if (htmlInput && jsonFiles.length > 0) {
            this.showImportError("Please use either HTML links OR JSON files, not both. Remove one to continue.");
            return;
        }
        
        // If only JSON files are provided
        if (jsonFiles.length > 0 && !htmlInput) {
            await this.handleJsonImport();
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
            let skippedCount = 0;

            for (const link of parsedLinks) {
                const story = {
                    title: link.title,
                    mainStoryUrl: link.url,
                    domain: this.extractDomain(link.url),
                    dateAdded: new Date().toISOString()
                };

                const saved = await StoryTracker.saveStory(story);
                if (saved) {
                    this.stories.push(story);
                    importedCount++;
                } else {
                    skippedCount++;
                }
            }

            if (importedCount > 0) {
                this.populateDomainFilter();
                this.applyFilters();
                this.renderTable();
                this.hideImportModal();
                
                let message = `Successfully imported ${importedCount} new stories.`;
                if (skippedCount > 0) {
                    message += ` Skipped ${skippedCount} duplicates.`;
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
    async exportStories() {
        if (this.stories.length === 0) {
            alert("No stories to export.");
            return;
        }

        let storiesToExport = this.stories;
        let exportType = "all";

        // If stories are selected, offer choice to export selected or all
        if (this.selectedStories.size > 0) {
            const selectedCount = this.selectedStories.size;
            const totalCount = this.stories.length;
            
            const exportChoice = confirm(
                `You have ${selectedCount} stories selected.\n\n` +
                "Click OK to export only the selected stories.\n" +
                `Click Cancel to export all ${totalCount} stories.`
            );
            
            if (exportChoice) {
                // User chose to export selected stories only
                storiesToExport = this.stories.filter(s => this.selectedStories.has(s.id));
                exportType = "selected";
            }
        }

        // Get username if set
        let username = "";
        try {
            const result = await chrome.storage.local.get(["exportUsername"]);
            if (result.exportUsername) {
                username = result.exportUsername;
            }
        } catch (error) {
            console.log("Could not get username for export:", error);
        }

        const exportData = {
            exportDate: new Date().toISOString(),
            storiesCount: storiesToExport.length,
            exportType: exportType,
            stories: storiesToExport
        };
        
        // Only add exportedBy field if username is set
        if (username) {
            exportData.exportedBy = username;
        }

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: "application/json" });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const currentDate = now.toISOString().split("T")[0]; // YYYY-MM-DD format
        const currentTime = now.toTimeString().split(" ")[0].replace(/:/g, "-"); // HH-MM-SS format
        
        // Build filename parts
        const selectionIndicator = exportType === "selected" ? "_selected" : "";
        let filename;
        
        if (username) {
            // Sanitize username for filename (remove special characters)
            const safeUsername = username.replace(/[^a-zA-Z0-9-_]/g, "");
            filename = `grabby-stories${selectionIndicator}_${currentDate}_${currentTime}_${safeUsername}.json`;
        } else {
            // No username, don't append anything
            filename = `grabby-stories${selectionIndicator}_${currentDate}_${currentTime}.json`;
        }

        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }


    // Handle JSON file import (supports multiple files)
    async handleJsonImport() {
        const fileInput = document.getElementById("json-file");
        const files = fileInput.files;
        
        if (!files || files.length === 0) {
            alert("Please select one or more JSON files to import.");
            return;
        }

        try {
            let totalStoriesFound = 0;
            let allStoriesToImport = [];
            let invalidFiles = [];
            let total = files.length;

            // Process all selected files
            for (const file of files) {
                try {
                    const text = await file.text();
                    const data = JSON.parse(text);
                    
                    // Validate the backup format
                    if (!data.stories || !Array.isArray(data.stories)) {
                        invalidFiles.push(file.name);
                        continue;
                    }

                    totalStoriesFound += data.stories.length;
                    allStoriesToImport.push(...data.stories);
                } catch (error) {
                    console.error(`Error reading file ${file.name}:`, error);
                    invalidFiles.push(file.name);
                }
            }

            // Show errors for invalid files
            if (invalidFiles.length > 0) {
                alert(`Warning: ${invalidFiles.length} file(s) could not be processed:\n${invalidFiles.join(", ")}\n\nValid files will still be imported.`);
            }

            if (allStoriesToImport.length === 0) {
                alert("No valid stories found in the selected files.");
                return;
            }

            const confirmMessage = `Found ${totalStoriesFound} stories across ${files.length} file(s). Import these stories?\n\nNote: Existing stories with the same URLs will be skipped.`;
            if (!confirm(confirmMessage)) {
                return;
            }

            let importedCount = 0;
            let totalSkipped = 0;

            for (const storyData of allStoriesToImport) {
                // Ensure domain field exists for imported stories
                if (!storyData.domain && storyData.mainStoryUrl) {
                    storyData.domain = this.extractDomain(storyData.mainStoryUrl);
                }
                
                const saved = await StoryTracker.saveStory(storyData);
                if (saved) {
                    this.stories.push(storyData);
                    importedCount++;
                } else {
                    totalSkipped++;
                }
            }

            if (importedCount > 0) {
                this.populateDomainFilter();
                this.applyFilters();
                this.renderTable();
                this.hideImportModal();
                
                let message = `Successfully imported ${importedCount} stories from ${total} JSON file(s).`;
                if (totalSkipped > 0) {
                    message += ` Skipped ${totalSkipped} duplicates.`;
                }
                if (invalidFiles.length > 0) {
                    message += ` ${invalidFiles.length} file(s) were invalid.`;
                }
                alert(message);
            } else {
                alert("No new stories to import. All stories in the selected files already exist.");
            }
        } catch (error) {
            console.error("Error importing JSON files:", error);
            alert("Error processing JSON files. Please check the file formats and try again.");
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
                await StoryTracker.saveStory(story);
                
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

    // Handle auto grab new chapters for selected stories using queue system
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
            
            // Check if the domain supports auto-nav using WEBSITE_CONFIGS
            try {
                const config = findMatchingConfig(story.lastChapterUrl);
                return config?.autoNav?.enabled === true;
            } catch {
                return false;
            }
        });

        if (eligibleStories.length === 0) {
            alert("No selected stories support auto-nav. Stories need:\n• A saved last chapter URL\n• Be from a site with auto-nav enabled in config");
            return;
        }

        try {
            // First check if there's an active queue
            const queueStatus = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    target: "background",
                    type: "getQueueStatus"
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            let messageType;
            let actionDescription;
            
            if (queueStatus && queueStatus.isActive) {
                // Queue is active, add to existing queue
                messageType = "addToQueue";
                actionDescription = `Adding ${eligibleStories.length} stories to active queue`;
            } else {
                // No active queue, start new one
                messageType = "startQueueProcessing";
                actionDescription = `Starting queue processing for ${eligibleStories.length} stories`;
            }

            // Send message to background to start queue processing or add to queue
            const response = await new Promise((resolve, reject) => {
                chrome.runtime.sendMessage({
                    target: "background",
                    type: messageType,
                    stories: eligibleStories
                }, (response) => {
                    if (chrome.runtime.lastError) {
                        reject(new Error(chrome.runtime.lastError.message));
                    } else {
                        resolve(response);
                    }
                });
            });

            if (response.error) {
                alert(`Error ${messageType === "addToQueue" ? "adding to queue" : "starting queue processing"}: ${response.error}`);
                return;
            }

            // Show the queue progress section
            this.showQueueProgress();
            
        } catch (error) {
            console.error("Error with queue processing:", error);
            const errorMessage = error.message || error.toString() || "Unknown error";
            alert(`Error with queue processing: ${errorMessage}`);
        }
    }

    async refresh() {
        await this.loadStories();
        this.populateDomainFilter();
        this.applyFilters();
        this.renderTable();
    }

    // Queue control methods
    pauseQueue() {
        chrome.runtime.sendMessage({
            target: "background",
            type: "pauseQueue"
        });
    }

    resumeQueue() {
        chrome.runtime.sendMessage({
            target: "background",
            type: "resumeQueue"
        });
    }

    cancelQueue() {
        if (confirm("Are you sure you want to cancel the queue processing? This will stop all pending operations.")) {
            chrome.runtime.sendMessage({
                target: "background",
                type: "cancelQueue"
            });
        }
    }

    // Show/hide queue progress section
    showQueueProgress() {
        const queueProgress = document.getElementById("queue-progress");
        queueProgress.style.display = "block";
        
        // Update Auto Grab button when queue is active
        this.updateAutoGrabButtonForActiveQueue();
    }

    updateAutoGrabButtonForActiveQueue() {
        const grabChaptersBtn = document.getElementById("grab-chapters-btn");
        grabChaptersBtn.disabled = this.selectedStories.size === 0;
        
        if (this.selectedStories.size === 0) {
            grabChaptersBtn.textContent = "Queue Processing...";
        } else {
            grabChaptersBtn.textContent = "Add to Queue";
        }
    }

    hideQueueProgress() {
        const queueProgress = document.getElementById("queue-progress");
        queueProgress.style.display = "none";
    }

    closeQueueProgress() {
        this.hideQueueProgress();
        
        // Clear completed queue status in background
        chrome.runtime.sendMessage({
            target: "background",
            type: "clearCompletedQueue"
        });
        
        // Re-enable Auto Grab button when queue is manually closed
        const grabChaptersBtn = document.getElementById("grab-chapters-btn");
        grabChaptersBtn.disabled = this.selectedStories.size === 0; // Enable if stories are selected
        grabChaptersBtn.textContent = "Grab New Chapters";
    }

    // Handle queue progress updates from background script
    handleQueueProgressUpdate(status) {
        if (!status) {
            // Only hide if no queue was ever started, otherwise keep summary visible
            return;
        }

        // Show progress section if queue is active or completed
        if (status.isActive) {
            this.showQueueProgress();
        } else {
            // Queue is complete - show summary with close button
            const queueProgress = document.getElementById("queue-progress");
            queueProgress.style.display = "block";
        }

        // Update queue control button states
        const pauseBtn = document.getElementById("pause-queue-btn");
        const resumeBtn = document.getElementById("resume-queue-btn");
        const cancelBtn = document.getElementById("cancel-queue-btn");
        const closeBtn = document.getElementById("close-queue-btn");

        if (status.isActive) {
            // Queue is running - show appropriate control buttons
            if (status.isPaused) {
                pauseBtn.style.display = "none";
                resumeBtn.style.display = "inline-block";
                cancelBtn.style.display = "inline-block";
                closeBtn.style.display = "none";
            } else {
                pauseBtn.style.display = "inline-block";
                resumeBtn.style.display = "none";
                cancelBtn.style.display = "inline-block";
                closeBtn.style.display = "none";
            }
        } else {
            // Queue is complete - only show close button
            pauseBtn.style.display = "none";
            resumeBtn.style.display = "none";
            cancelBtn.style.display = "none";
            closeBtn.style.display = "inline-block";
            
            // Reset Auto Grab button when queue is complete
            const grabChaptersBtn = document.getElementById("grab-chapters-btn");
            grabChaptersBtn.disabled = this.selectedStories.size === 0;
            grabChaptersBtn.textContent = "Grab New Chapters";
        }
        
        // Update Auto Grab button if queue is active
        if (status.isActive) {
            this.updateAutoGrabButtonForActiveQueue();
        }

        // Update statistics
        document.getElementById("queue-total").textContent = status.stats.total;
        document.getElementById("queue-processing").textContent = status.stats.processing;
        document.getElementById("queue-queued").textContent = status.stats.queued;
        document.getElementById("queue-completed").textContent = status.stats.completed;
        document.getElementById("queue-failed").textContent = status.stats.failed;

        // Update story lists
        this.updateQueueStoryList("processing-stories", status.processing);
        this.updateQueueStoryList("queued-stories", status.queue);
        this.updateQueueStoryList("completed-stories", status.completed);
    }

    // Update a specific story list in the queue progress section
    updateQueueStoryList(containerId, stories) {
        const container = document.getElementById(containerId);
        if (!container) return;

        container.innerHTML = "";
        
        if (!stories || stories.length === 0) {
            container.innerHTML = "<p class='no-stories'>None</p>";
            return;
        }

        stories.forEach(story => {
            const storyElement = document.createElement("div");
            storyElement.className = "story-item";
            
            // Apply appropriate status class
            if (story.status) {
                switch (story.status) {
                    case "success":
                        storyElement.classList.add("completed");
                        break;
                    case "error":
                        storyElement.classList.add("error");
                        break;
                    case "no-content":
                        storyElement.classList.add("no-content");
                        break;
                    case "cancelled":
                        storyElement.classList.add("cancelled");
                        break;
                    case "processing":
                        storyElement.classList.add("processing");
                        break;
                    case "starting":
                        storyElement.classList.add("processing"); // Use processing style for starting
                        break;
                }
            } else {
                // For queued stories without status
                storyElement.classList.add("queued");
            }
            
            // Create title and status elements
            const titleElement = document.createElement("div");
            titleElement.className = "story-item-title";
            titleElement.textContent = story.title;
            
            const statusElement = document.createElement("div");
            statusElement.className = "story-item-status";
            
            if (story.status) {
                switch (story.status) {
                    case "success":
                        statusElement.textContent = story.message || "Completed successfully";
                        break;
                    case "error":
                        statusElement.textContent = story.message || "Error occurred";
                        break;
                    case "no-content":
                        statusElement.textContent = story.message || "No content available";
                        break;
                    case "cancelled":
                        statusElement.textContent = "Cancelled";
                        break;
                    case "processing":
                    case "starting": {
                        // Show domain info for processing items
                        let statusText = "";
                        if (story.lastChapterUrl) {
                            statusText = story.domain || this.extractDomain(story.lastChapterUrl);
                        } else {
                            statusText = story.status === "starting" ? "Starting..." : "Processing...";
                        }
                        statusElement.textContent = statusText;
                        break;
                    }
                }
            } else {
                // For queued items, show domain
                let statusText = "";
                if (story.lastChapterUrl) {
                    statusText = story.domain || this.extractDomain(story.lastChapterUrl);
                } else {
                    statusText = "Queued";
                }
                statusElement.textContent = statusText;
            }
            
            storyElement.appendChild(titleElement);
            storyElement.appendChild(statusElement);
            
            if (story.message && story.status !== "error") {
                storyElement.title = story.message;
            }
            
            container.appendChild(storyElement);
        });
    }
}

// Initialize the story tracker when the page loads
document.addEventListener("DOMContentLoaded", () => {
    const storyTracker = new StoryTrackerTable();
    
    // Check for any active queue operations on page load
    chrome.runtime.sendMessage({
        target: "background",
        type: "getQueueStatus"
    }, (response) => {
        if (response && response.isActive) {
            storyTracker.handleQueueProgressUpdate(response);
        }
    });
});
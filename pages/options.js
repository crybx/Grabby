document.addEventListener("DOMContentLoaded", function() {
    const closePageLink = document.getElementById("close-page");
    const openStoryTrackerBtn = document.getElementById("open-story-tracker-btn");
    const showFloatingButtonCheckbox = document.getElementById("show-floating-button");
    const exportUsernameInput = document.getElementById("export-username");
    const autoQueueDomainsContainer = document.getElementById("auto-queue-domains");
    const addAutoQueueDomainBtn = document.getElementById("add-auto-queue-domain");

    if (closePageLink) {
        closePageLink.addEventListener("click", function(e) {
            e.preventDefault();
            window.close();
        });
    }

    if (openStoryTrackerBtn) {
        openStoryTrackerBtn.addEventListener("click", function(e) {
            e.preventDefault();
            chrome.tabs.create({ url: chrome.runtime.getURL("pages/story-tracker.html") });
        });
    }

    // Load and save floating button setting
    if (showFloatingButtonCheckbox) {
        // Load current setting
        chrome.storage.sync.get(["showFloatingButton"], function(result) {
            showFloatingButtonCheckbox.checked = result.showFloatingButton !== false; // Default to true
        });

        // Save setting when changed
        showFloatingButtonCheckbox.addEventListener("change", function() {
            chrome.storage.sync.set({
                showFloatingButton: this.checked
            });
        });
    }

    // Load and save export username setting
    if (exportUsernameInput) {
        // Load current setting
        chrome.storage.local.get(["exportUsername"], function(result) {
            if (result.exportUsername) {
                exportUsernameInput.value = result.exportUsername;
            }
        });

        // Save setting when changed (with debounce)
        let saveTimeout;
        exportUsernameInput.addEventListener("input", function() {
            clearTimeout(saveTimeout);
            const username = this.value.trim();
            
            saveTimeout = setTimeout(() => {
                if (username) {
                    chrome.storage.local.set({
                        exportUsername: username
                    });
                } else {
                    // Remove the setting if empty
                    chrome.storage.local.remove("exportUsername");
                }
            }, 500); // Save after 500ms of no typing
        });
    }

    // Auto-Queue Settings
    function getAutoNavDomains() {
        const domains = [];
        
        // Check single domains
        if (WEBSITE_CONFIGS && WEBSITE_CONFIGS.singleDomains) {
            for (const [domain, config] of Object.entries(WEBSITE_CONFIGS.singleDomains)) {
                if (config.autoNav && config.autoNav.enabled === true) {
                    domains.push(domain);
                }
            }
        }
        
        // Check multi domains
        if (WEBSITE_CONFIGS && WEBSITE_CONFIGS.multiDomains) {
            for (const [groupName, groupConfig] of Object.entries(WEBSITE_CONFIGS.multiDomains)) {
                if (groupConfig.autoNav && groupConfig.autoNav.enabled === true && groupConfig.domains) {
                    domains.push(...groupConfig.domains);
                }
            }
        }
        
        return domains.sort();
    }

    async function loadAutoQueueSettings() {
        return new Promise((resolve) => {
            chrome.storage.local.get("autoQueueSettings", function(result) {
                if (result.autoQueueSettings) {
                    resolve(result.autoQueueSettings);
                } else {
                    resolve({});
                }
            });
        });
    }

    function saveAutoQueueSettings(settings) {
        chrome.storage.local.set({ autoQueueSettings: settings });
    }

    function createDomainSettingRow(domain, days = 1, isNew = false) {
        const row = document.createElement("div");
        row.className = "auto-queue-domain-row";
        
        if (isNew) {
            // Create dropdown for new domain
            const select = document.createElement("select");
            select.className = "domain-select";
            
            const defaultOption = document.createElement("option");
            defaultOption.value = "";
            defaultOption.textContent = "Select a domain...";
            select.appendChild(defaultOption);
            
            const availableDomains = getAutoNavDomains();
            loadAutoQueueSettings().then(currentSettings => {
                availableDomains.forEach(d => {
                    if (!currentSettings[d]) {
                        const option = document.createElement("option");
                        option.value = d;
                        option.textContent = d;
                        select.appendChild(option);
                    }
                });
            });
            
            row.appendChild(select);
        } else {
            // Display domain name
            const domainLabel = document.createElement("span");
            domainLabel.className = "domain-label";
            domainLabel.textContent = domain;
            row.appendChild(domainLabel);
        }
        
        // Days input
        const daysInput = document.createElement("input");
        daysInput.type = "number";
        daysInput.min = "0.25";
        daysInput.step = "0.25";
        daysInput.value = days;
        daysInput.className = "days-input";
        row.appendChild(daysInput);
        
        const daysLabel = document.createElement("span");
        daysLabel.textContent = "days";
        row.appendChild(daysLabel);
        
        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.textContent = isNew ? "Add" : "Remove";
        removeBtn.className = isNew ? "add-btn" : "remove-btn";
        row.appendChild(removeBtn);
        
        if (isNew) {
            removeBtn.addEventListener("click", async function() {
                const selectedDomain = row.querySelector(".domain-select").value;
                const daysValue = parseFloat(row.querySelector(".days-input").value);
                
                if (selectedDomain && daysValue > 0) {
                    const settings = await loadAutoQueueSettings();
                    settings[selectedDomain] = daysValue;
                    saveAutoQueueSettings(settings);
                    renderAutoQueueDomains();
                }
            });
        } else {
            // Update days on change
            daysInput.addEventListener("change", async function() {
                const daysValue = parseFloat(this.value);
                if (daysValue > 0) {
                    const settings = await loadAutoQueueSettings();
                    settings[domain] = daysValue;
                    saveAutoQueueSettings(settings);
                }
            });
            
            // Remove domain
            removeBtn.addEventListener("click", async function() {
                const settings = await loadAutoQueueSettings();
                delete settings[domain];
                saveAutoQueueSettings(settings);
                renderAutoQueueDomains();
            });
        }
        
        return row;
    }

    async function renderAutoQueueDomains() {
        if (!autoQueueDomainsContainer) return;
        
        autoQueueDomainsContainer.innerHTML = "";
        
        const settings = await loadAutoQueueSettings();
        const sortedDomains = Object.keys(settings).sort();
        
        if (sortedDomains.length === 0) {
            const emptyMessage = document.createElement("p");
            emptyMessage.className = "auto-queue-empty-message";
            emptyMessage.textContent = "No domains configured for auto-queue. Click 'Add Domain' to add one.";
            autoQueueDomainsContainer.appendChild(emptyMessage);
        } else {
            sortedDomains.forEach(domain => {
                const row = createDomainSettingRow(domain, settings[domain]);
                autoQueueDomainsContainer.appendChild(row);
            });
        }
    }

    if (addAutoQueueDomainBtn) {
        addAutoQueueDomainBtn.addEventListener("click", async function() {
            const availableDomains = getAutoNavDomains();
            const currentSettings = await loadAutoQueueSettings();
            const unusedDomains = availableDomains.filter(d => !currentSettings[d]);
            
            if (unusedDomains.length === 0) {
                alert("All available domains have been configured.");
                return;
            }
            
            // Check if there's already a new row being added
            const existingNewRow = autoQueueDomainsContainer.querySelector(".domain-select");
            if (existingNewRow) {
                return;
            }
            
            const newRow = createDomainSettingRow("", 1, true);
            autoQueueDomainsContainer.appendChild(newRow);
        });
    }

    // Initialize auto-queue settings display
    renderAutoQueueDomains();
});
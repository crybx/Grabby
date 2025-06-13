// Function to scroll to bottom of page (useful for infinite scroll sites)
function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
    console.log("Scrolled to bottom of page");
}

// Function to scroll to top of page
function scrollToTop() {
    window.scrollTo(0, 0);
    console.log("Scrolled to top of page");
}

// Function to wait for an element to appear (useful for dynamic content)
function waitForElement(selector, timeout = 5000) {
    return new Promise((resolve) => {
        const element = document.querySelector(selector);
        if (element) {
            resolve(element);
            return;
        }
        
        const observer = new MutationObserver(() => {
            const element = document.querySelector(selector);
            if (element) {
                observer.disconnect();
                resolve(element);
            }
        });
        
        observer.observe(document.body, { childList: true, subtree: true });
        
        setTimeout(() => {
            observer.disconnect();
            resolve(null);
        }, timeout);
    });
}

// Function to remove overlay/modal elements (useful for sites with popups)
function removeOverlays(selectors = [".modal", ".overlay", ".popup", "[role=\"dialog\"]"]) {
    selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.remove();
            console.log(`Removed overlay element: ${selector}`);
        });
    });
}

// Function to expand collapsed content (useful for sites that hide content behind "read more")
function expandContent(selectors = [".read-more", ".expand", ".show-more"]) {
    selectors.forEach(selector => {
        const buttons = document.querySelectorAll(selector);
        buttons.forEach(button => {
            button.click();
            console.log(`Clicked expand button: ${selector}`);
        });
    });
}

// Function to disable page animations/transitions (useful for faster grabbing)
function disableAnimations() {
    const style = document.createElement("style");
    style.textContent = `
        *, *::before, *::after {
            animation-duration: 0.01ms !important;
            animation-delay: -0.01ms !important;
            transition-duration: 0.01ms !important;
            transition-delay: 0.01ms !important;
        }
    `;
    document.head.appendChild(style);
    console.log("Disabled page animations");
}

// Function to load all images (useful for sites with lazy loading)
function loadAllImages() {
    const images = document.querySelectorAll("img[data-src], img[data-lazy]");
    images.forEach(img => {
        if (img.dataset.src) {
            img.src = img.dataset.src;
        }
        if (img.dataset.lazy) {
            img.src = img.dataset.lazy;
        }
    });
    console.log(`Triggered loading of ${images.length} lazy images`);
}

// Peach Tea Agency specific: Click "All on one page?" button if it exists
async function peachTeaClickAllOnOnePageButton(duplicateCheck = true) {
    // Check for duplicates first unless disabled
    if (duplicateCheck) {
        const duplicateResult = await checkForDuplicateChapter();
        if (duplicateResult.abort) return duplicateResult;
    }

    // Look for buttons/links with "All on one page?" text
    const allElements = document.querySelectorAll("button, a, [role=\"button\"]");
    
    for (const element of allElements) {
        if (element.textContent.trim() === "All on one page?") {
            element.click();
            
            // Wait half a second for the page to load the full content
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return true;
        }
    }

    return false;
}

// Function to check for premium/locked content and abort if found
async function checkForPremiumContent(selectors = ["h2, h3"], duplicateCheck = true) {
    // Check for duplicates first unless disabled
    if (duplicateCheck) {
        const duplicateResult = await checkForDuplicateChapter();
        if (duplicateResult.abort) return duplicateResult;
    }
    
    const premiumIndicators = [
        "Premium Content",
        "Locked Chapter",
        "Purchase Required",
        "Subscription Required",
        "VIP Content",
        "Paid Content",
        "Please Login or Register First",
        "Login to buy access to the advanced chapters."
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            if (premiumIndicators.some(indicator => text.includes(indicator))) {
                console.log(`Premium content detected: "${text}" - aborting grab`);
                return { abort: true, reason: `Premium content detected: ${text}`, invalidateGrab: true };
            }
        }
    }
    
    return { abort: false };
}

// Function to check for page not found errors and abort if found
async function checkForPageNotFound(selectors = ["h1", "h2", "h3", ".error-message", ".not-found", ".page-title", ".blog-post-title-font"], duplicateCheck = true) {
    // Check for duplicates first unless disabled
    if (duplicateCheck) {
        const duplicateResult = await checkForDuplicateChapter();
        if (duplicateResult.abort) return duplicateResult;
    }
    
    const notFoundIndicators = [
        "We Couldn't Find This Page",
        "We Couldn’t Find This Page",
        "Page Not Found",
        "404 Error",
        "404 Not Found",
        "This page does not exist",
        "The page you requested could not be found"
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            if (notFoundIndicators.some(indicator => text.includes(indicator))) {
                console.log(`Page not found error detected: "${text}" - aborting grab`);
                return { abort: true, reason: `Page not found: "${text}"` };
            }
        }
    }
    
    return { abort: false };
}

// Function to check if current URL is a duplicate chapter and abort if found
async function checkForDuplicateChapter(duplicateCheck = true) {
    if (!duplicateCheck) {
        return { abort: false };
    }
    
    if (typeof StoryTracker !== "undefined") {
        try {
            const isDuplicate = await StoryTracker.isDuplicateChapter(window.location.href);
            if (isDuplicate) {
                console.log("Duplicate chapter detected before grabbing - aborting grab");
                return { abort: true, reason: "Duplicate chapter - already grabbed this URL" };
            }
        } catch (error) {
            console.error("Error checking for duplicate chapter:", error);
        }
    }
    
    return { abort: false };
}

// Export functions to window for global access
window.PreGrabActions = {
    scrollToBottom,
    scrollToTop,
    waitForElement,
    removeOverlays,
    expandContent,
    disableAnimations,
    loadAllImages,
    peachTeaClickAllOnOnePageButton,
    checkForPremiumContent,
    checkForPageNotFound,
    checkForDuplicateChapter
};
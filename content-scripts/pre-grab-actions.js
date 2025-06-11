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
async function peachTeaClickAllOnOnePageButton() {
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
    
    console.log("No \"All on one page?\" button found - continuing with normal grab");
    return false;
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
    peachTeaClickAllOnOnePageButton
};
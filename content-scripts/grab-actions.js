// Function to scroll to bottom of page (useful for infinite scroll sites)
function scrollToBottom() {
    window.scrollTo(0, document.body.scrollHeight);
}

// Function to scroll to top of page
function scrollToTop() {
    window.scrollTo(0, 0);
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
}

// Peach Tea Agency specific: Click "All on one page?" button if it exists
async function peachTeaClickAllOnOnePageButton() {
    // Look for buttons/links with "All on one page?" text
    const allElements = document.querySelectorAll("button, a, [role=\"button\"]");
    
    for (const element of allElements) {
        if (element.textContent.trim() === "All on one page?") {
            clickElement(element);
            
            // Wait half a second for the page to load the full content
            await new Promise(resolve => setTimeout(resolve, 500));
            
            return true;
        }
    }

    return false;
}

// Function to check for premium/locked content and abort if found
async function checkForPremiumContent(selectors = ["h2, h3"], premiumText = null) {
    if (!premiumText) {
        premiumText = [
            "Advanced Chapter",
            "Premium Content",
            "Locked Chapter",
            "Purchase Required",
            "Subscription Required",
            "VIP Content",
            "Paid Content",
            "Please Login or Register First",
            "Login to buy access to the advanced chapters.",
            "This is a premium chapter",
            "🔒"
        ];
    }
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            if (premiumText.some(indicator => text.includes(indicator))) {
                console.log(`Premium content detected: "${text}" - aborting grab`);
                return { abort: true, reason: `Premium content detected: ${text}` };
            }
        }
    }
    
    return { abort: false };
}

// Function to check if URL contains certain text and abort if found
async function checkForUrlText(urlText = []) {
    if (!Array.isArray(urlText) || urlText.length === 0) {
        console.log("No URL text patterns provided for checking");
        return { abort: false };
    }
    
    const currentUrl = window.location.href.toLowerCase();
    
    for (const textToCheck of urlText) {
        const searchText = textToCheck.toLowerCase();
        if (currentUrl.includes(searchText)) {
            console.log(`URL contains restricted text: "${textToCheck}" - aborting grab`);
            return { abort: true, reason: `URL contains restricted text: "${textToCheck}"` };
        }
    }
    
    return { abort: false };
}

// Function to check for page not found errors and abort if found
async function checkForPageNotFound(selectors = ["h1", "h2", "h3", ".error-message", ".not-found", ".page-title", ".blog-post-title-font"]) {
    const notFoundIndicators = [
        "We Couldn’t Find This Page",
        "We Couldn't Find This Page",
        "Page Not Found",
        "404",
        "This page does not exist",
        "The page you requested could not be found",
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

async function googleTranslate() {
    scrollToBottom();
    // wait 3 seconds for translation to complete
    await new Promise(r => setTimeout(r, 3100));
}

// specifically for Peach Tea Agency
async function peachTeaClickNextChapterLink() {
    // Find all links that contain "Next chapter" as exact text
    const allLinks = document.querySelectorAll("a");
    
    for (const link of allLinks) {
        // Check if the link text is exactly "Next chapter"
        if (link.textContent.trim() === "Next chapter") {
            // Check if it doesn't have honeypotButton class
            if (!link.classList.contains("honeypotButton")) {
                // Check if it's not position: absolute
                const styles = window.getComputedStyle(link);
                if (styles.position !== "absolute") {
                    console.log("Found valid \"Next chapter\" link, clicking:", link);
                    clickElement(link);
                    return; // Exit after clicking the first valid link
                } else {
                    console.log("Skipped \"Next chapter\" link with position: absolute");
                }
            }
        }
    }
}

// Helper function to check if element should be excluded
function isElementValid(element, excludeClasses = [], excludeStyles = {}) {
    // Check excluded classes
    if (excludeClasses.some(cls => element.classList.contains(cls))) {
        return false;
    }
    
    // Check excluded styles
    const styles = window.getComputedStyle(element);
    const hasExcludedStyle = Object.entries(excludeStyles).some(([prop, value]) => styles[prop] === value);
    return !hasExcludedStyle;
}

// Helper function to click an element (handles both links and buttons)
function clickElement(element) {
    // Use window.location.href to ensure navigation happens in same tab
    if (element.href) {
        window.location.href = element.href;
    } else {
        // Fallback to click if no href (for non-link elements)
        element.click();
    }
}

// Function to click an element containing specific text or texts
// Can be used as: clickElementWithText("Next", { exact: true }) or clickElementWithText(["Next", "Episode"])
function clickElementWithText(text, options = {}) {
    // If no text provided, return a function that can be called later
    if (arguments.length === 0) {
        return function() {
            return clickElementWithText("Next", { exact: false });
        };
    }
    
    const {
        exact = false, // Whether to match exact text or just contain
        excludeClasses = [], // Array of classes to exclude
        excludeStyles = {}, // Object of CSS styles to exclude (e.g., {position: 'absolute'})
        selector = "a, button, [role=\"button\"]", // CSS selector for elements to check (default to clickable elements)
        abortIfNotFound = false // Whether to abort bulk grab sequence if no element is found
    } = options;
    
    // Convert text to array if it's a string
    const textArray = Array.isArray(text) ? text : [text];
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
        const elementText = element.textContent.trim();
        
        // Check if element text matches any of the target texts
        const textMatches = textArray.some(targetText => 
            exact ? elementText === targetText : elementText.includes(targetText)
        );
        
        if (textMatches) {
            if (isElementValid(element, excludeClasses, excludeStyles)) {
                clickElement(element);
                return true;
            }
        }
    }
    
    const textDescription = Array.isArray(text) ? `any of [${text.join(", ")}]` : `"${text}"`;
    if (abortIfNotFound) {
        return { abort: true, reason: `No valid element found with text: ${textDescription}` };
    }
    return false;
}

// Function to click an element by CSS selector (without requiring text matching)
function clickElementBySelector(selector, options = {}) {
    const {
        excludeClasses = [], // Array of classes to exclude
        excludeStyles = {}, // Object of CSS styles to exclude
        abortIfNotFound = false, // Whether to abort bulk grab sequence if no element is found
        index = null // Index of element to click (0-based), if null clicks first valid element
    } = options;
    
    const elements = document.querySelectorAll(selector);
    
    // If index is specified, try to click that specific element
    if (index !== null) {
        if (index >= 0 && index < elements.length) {
            const element = elements[index];
            if (isElementValid(element, excludeClasses, excludeStyles)) {
                clickElement(element);
                return true;
            }
        }
        if (abortIfNotFound) {
            return { abort: true, reason: `Element at index ${index} not found or invalid with selector: ${selector}` };
        }
        return false;
    }
    
    // Default behavior: click first valid element
    for (const element of elements) {
        if (isElementValid(element, excludeClasses, excludeStyles)) {
            clickElement(element);
            return true;
        }
    }
    
    if (abortIfNotFound) {
        return { abort: true, reason: `No valid element found with selector: ${selector}` };
    }
    return false;
}

function clickPreviousChapterLink() {
    const previousTexts = ["Previous chapter", "Previous", "Prev", "← Previous", "‹ Previous"];
    
    for (const text of previousTexts) {
        if (clickElementWithText(text, { exact: true, selector: "a" })) {
            return true;
        }
    }
    
    return false;
}

function clickNextPageLink() {
    const nextTexts = ["Next chapter", "Next page", "Next", "→", "Continue", "Read more"];
    
    for (const text of nextTexts) {
        if (clickElementWithText(text, { exact: false, selector: "a" })) {
            return true;
        }
    }

    return false;
}

// Function to simulate a key press
function simulateKeyPress(key, options = {}) {
    const {
        ctrlKey = false,
        shiftKey = false,
        altKey = false,
        metaKey = false,
        target = document.body  // Element to dispatch the event on
    } = options;
    
    // Create the key events
    const keydownEvent = new KeyboardEvent("keydown", {
        key: key,
        code: getKeyCode(key),
        keyCode: getKeyCodeNumber(key),
        which: getKeyCodeNumber(key),
        ctrlKey: ctrlKey,
        shiftKey: shiftKey,
        altKey: altKey,
        metaKey: metaKey,
        bubbles: true,
        cancelable: true
    });
    
    const keyupEvent = new KeyboardEvent("keyup", {
        key: key,
        code: getKeyCode(key),
        keyCode: getKeyCodeNumber(key),
        which: getKeyCodeNumber(key),
        ctrlKey: ctrlKey,
        shiftKey: shiftKey,
        altKey: altKey,
        metaKey: metaKey,
        bubbles: true,
        cancelable: true
    });
    
    // Dispatch the events
    target.dispatchEvent(keydownEvent);
    target.dispatchEvent(keyupEvent);
}

// Helper function to get the code for a key
function getKeyCode(key) {
    const keyCodes = {
        "ArrowLeft": "ArrowLeft",
        "ArrowRight": "ArrowRight", 
        "ArrowUp": "ArrowUp",
        "ArrowDown": "ArrowDown",
        "Enter": "Enter",
        "Space": "Space",
        "Escape": "Escape",
        "Tab": "Tab",
        "Backspace": "Backspace",
        "Delete": "Delete",
        "Home": "Home",
        "End": "End",
        "PageUp": "PageUp",
        "PageDown": "PageDown"
    };
    return keyCodes[key] || key;
}

// Helper function to get the numeric keyCode for a key
function getKeyCodeNumber(key) {
    const keyCodes = {
        "ArrowLeft": 37,
        "ArrowRight": 39,
        "ArrowUp": 38,
        "ArrowDown": 40,
        "Enter": 13,
        "Space": 32,
        "Escape": 27,
        "Tab": 9,
        "Backspace": 8,
        "Delete": 46,
        "Home": 36,
        "End": 35,
        "PageUp": 33,
        "PageDown": 34
    };
    return keyCodes[key] || key.charCodeAt(0);
}

// Convenience function to simulate right arrow key (for next chapter navigation)
function pressRightArrow() {
    simulateKeyPress("ArrowRight");
}

async function ridiNext() {
    let unownedEpisodeButtons = document.querySelectorAll(".checkout_contents_wrapper button");
    let unownedText = [
        "view next episode",
        "watch the next episode",
        "watch the nextepisode",
        "다음화 보기"
    ];
    for (let button of unownedEpisodeButtons) {
        const buttonText = button.textContent.trim().toLowerCase();
        if (unownedText.some(t => buttonText.includes(t))) {
            clickElement(button);
        }
    }
    pressRightArrow();

    // wait to let popup load
    await new Promise(r => setTimeout(r, 3100));
    let checkoutButtons = document.querySelectorAll(".checkout_buttons button");

    let paidText = [
        "pay and watch right away",
        "pay and watch immediately",
        "결제하고 바로 보기",
        "charge and pay",
        "충전하고 결제"
    ];
    let freeText = [
        "view for free",
        "무료로 보기",
        "watch for free"
    ];
    
    // No check button found, so look for real checkout buttons
    for (let button of checkoutButtons) {
        const buttonText = button.textContent?.trim()?.toLowerCase() || "";
        if (freeText.some(t => buttonText.includes(t))) {
            clickElement(button);
            // wait for page to load
            await new Promise(r => setTimeout(r, 3100));
            return;
        } else if (paidText.some(t => buttonText.includes(t))) {
            return { abort: true, reason: `Paid content detected: ${buttonText}` };
        }
    }
}

// Export functions to window for global access
window.GrabActions = {
    // Pre-grab actions
    scrollToBottom,
    scrollToTop,
    waitForElement,
    peachTeaClickAllOnOnePageButton,
    checkForPremiumContent,
    checkForUrlText,
    checkForPageNotFound,
    googleTranslate,
    // Post-grab actions
    peachTeaClickNextChapterLink,
    clickElementWithText,
    clickElementBySelector,
    clickPreviousChapterLink,
    clickNextPageLink,
    simulateKeyPress,
    pressRightArrow,
    ridiNext
};

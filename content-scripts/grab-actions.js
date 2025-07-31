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
        "Advanced Chapter",
        "Premium Content",
        "Locked Chapter",
        "Purchase Required",
        "Subscription Required",
        "VIP Content",
        "Paid Content",
        "Please Login or Register First",
        "Login to buy access to the advanced chapters.",
        "This is a premium chapter"
    ];
    
    for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        for (const element of elements) {
            const text = element.textContent.trim();
            console.log("checking text ", text);
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
        "We Couldn't Find This Page",
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

async function ridiTranslate() {
    scrollToBottom();
    // wait 3 seconds for translation to complete
    await new Promise(r => setTimeout(r, 3100));
}

// specifically for Peach Tea Agency
async function peachTeaClickNextChapterLink() {
    // First, ensure the "All on one page?" button is clicked to show the Next chapter link
    if (typeof GrabActions !== 'undefined' && GrabActions.peachTeaClickAllOnOnePageButton) {
        console.log("Calling peachTeaClickAllOnOnePageButton from postGrab to ensure Next chapter link is visible");
        await GrabActions.peachTeaClickAllOnOnePageButton(false);
    }
    
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
                    link.click();
                    return; // Exit after clicking the first valid link
                } else {
                    console.log("Skipped \"Next chapter\" link with position: absolute");
                }
            } else {
                console.log("Skipped \"Next chapter\" link with honeypotButton class");
            }
        }
    }
    
    console.log("No valid \"Next chapter\" link found");
}

// Generic function to click a link containing specific text or texts
// Can be used as: clickLinkContaining("Next", { exact: true }) or clickLinkContaining(["Next", "Episode"])
function clickLinkContaining(text, options = {}) {
    // If no text provided, return a function that can be called later
    if (arguments.length === 0) {
        return function() {
            return clickLinkContaining("Next", { exact: false });
        };
    }
    
    const {
        exact = false,           // Whether to match exact text or just contain
        excludeClasses = [],     // Array of classes to exclude
        excludeStyles = {},      // Object of CSS styles to exclude (e.g., {position: 'absolute'})
        selector = "a",          // CSS selector for elements to check
        abortIfNotFound = false  // Whether to abort autoGrab sequence if no element is found
    } = options;
    
    // Convert text to array if it's a string
    const textArray = Array.isArray(text) ? text : [text];
    
    const elements = document.querySelectorAll(selector);
    console.log(elements);
    
    for (const element of elements) {
        const elementText = element.textContent.trim();
        
        // Check if element text matches any of the target texts
        const textMatches = textArray.some(targetText => 
            exact ? elementText === targetText : elementText.includes(targetText)
        );
        
        if (textMatches) {
            // Check excluded classes
            if (excludeClasses.some(cls => element.classList.contains(cls))) {
                console.log(`Skipped element with excluded class: ${element.className}`);
                continue;
            }
            
            // Check excluded styles
            const styles = window.getComputedStyle(element);
            const hasExcludedStyle = Object.entries(excludeStyles).some(([prop, value]) => styles[prop] === value);
            if (hasExcludedStyle) {
                console.log(`Skipped element with excluded style: ${Object.entries(excludeStyles)}`);
                continue;
            }
            
            console.log(`Found valid element with text "${elementText}", navigating to:`, element.href);
            // Use window.location.href to ensure navigation happens in same tab
            if (element.href) {
                window.location.href = element.href;
            } else {
                // Fallback to click if no href (for non-link elements)
                element.click();
            }
            return true;
        }
    }
    
    const textDescription = Array.isArray(text) ? `any of [${text.join(', ')}]` : `"${text}"`;
    if (abortIfNotFound) {
        return { abort: true, reason: `No valid element found with text: ${textDescription}` };
    }
    console.log(`No valid element found with text: ${textDescription}`);
    return false;
}

// Function to click any button/link with specific text (not case-sensitive)
function clickElementWithText(text, options = {}) {
    const {
        selector = "a, button, [role=\"button\"]",  // Default to clickable elements
        exact = false,
        excludeClasses = [],
        excludeStyles = {}
    } = options;
    
    return clickLinkContaining(text, { selector, exact, excludeClasses, excludeStyles });
}

function clickPreviousChapterLink() {
    const previousTexts = ["Previous chapter", "Previous", "Prev", "← Previous", "‹ Previous"];
    
    for (const text of previousTexts) {
        if (clickLinkContaining(text, { exact: true })) {
            return true;
        }
    }
    
    console.log("No valid previous chapter link found");
    return false;
}

function clickNextPageLink() {
    const nextTexts = ["Next chapter", "Next page", "Next", "→", "Continue", "Read more"];
    
    for (const text of nextTexts) {
        if (clickLinkContaining(text, { exact: false })) {
            return true;
        }
    }
    
    console.log("No valid next page link found");
    return false;
}

// Function to bookmark the current page (add to favorites/reading list)
function bookmarkPage() {
    const bookmarkSelectors = [
        "button[title*=\"bookmark\"]",
        "button[title*=\"favorite\"]",
        ".bookmark-btn",
        ".favorite-btn",
        ".add-to-library"
    ];
    
    for (const selector of bookmarkSelectors) {
        const button = document.querySelector(selector);
        if (button) {
            button.click();
            console.log(`Bookmarked page using: ${selector}`);
            return true;
        }
    }
    
    console.log("No bookmark button found");
    return false;
}

// Function to close any notification/toast messages
function closeNotifications() {
    const notificationSelectors = [
        ".notification .close",
        ".toast .close",
        ".alert .close",
        "[role=\"alert\"] button",
        ".dismiss-btn"
    ];
    
    notificationSelectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        elements.forEach(element => {
            element.click();
            console.log(`Closed notification: ${selector}`);
        });
    });
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
    
    console.log(`Simulated key press: ${key}`);
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
    console.log("Pressed right arrow key for next chapter");
}

// Convenience function to simulate left arrow key (for previous chapter navigation)
function pressLeftArrow() {
    simulateKeyPress("ArrowLeft");
    console.log("Pressed left arrow key for previous chapter");
}

// Function to simulate Enter key press
function pressEnter() {
    simulateKeyPress("Enter");
    console.log("Pressed Enter key");
}

// Function to simulate Space key press (often used for next page)
function pressSpace() {
    simulateKeyPress("Space");
    console.log("Pressed Space key");
}

async function ridiNext() {
    let unownedEpisodeButtons = document.querySelectorAll('.checkout_contents_wrapper button');
    let unownedText = [
        "view next episode",
        "watch the next episode",
        "watch the nextepisode",
        "다음화 보기"
    ]
    for (let button of unownedEpisodeButtons) {
        const buttonText = button.textContent.trim().toLowerCase();
        if (unownedText.some(t => buttonText.includes(t))) {
            button.click();
        }
    }
    pressRightArrow();

    // wait to let popup load
    await new Promise(r => setTimeout(r, 3100));
    let checkoutButtons = document.querySelectorAll('.checkout_buttons button');

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
    ]
    
    // No check button found, so look for real checkout buttons
    for (let button of checkoutButtons) {
        const buttonText = button.textContent?.trim()?.toLowerCase() || '';
        if (freeText.some(t => buttonText.includes(t))) {
            button.click();
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
    removeOverlays,
    expandContent,
    disableAnimations,
    loadAllImages,
    peachTeaClickAllOnOnePageButton,
    checkForPremiumContent,
    checkForPageNotFound,
    checkForDuplicateChapter,
    ridiTranslate,
    // Post-grab actions
    peachTeaClickNextChapterLink,
    clickLinkContaining,
    clickElementWithText,
    clickPreviousChapterLink,
    clickNextPageLink,
    bookmarkPage,
    closeNotifications,
    simulateKeyPress,
    pressRightArrow,
    pressLeftArrow,
    pressEnter,
    pressSpace,
    ridiNext
};

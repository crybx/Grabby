// specifically for Peach Tea Agency
async function peachTeaClickNextChapterLink() {
    // First, ensure the "All on one page?" button is clicked to show the Next chapter link
    if (typeof PreGrabActions !== 'undefined' && PreGrabActions.peachTeaClickAllOnOnePageButton) {
        console.log("Calling peachTeaClickAllOnOnePageButton from postGrab to ensure Next chapter link is visible");
        await PreGrabActions.peachTeaClickAllOnOnePageButton();
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

// Generic function to click a link containing specific text
// Can be used as: clickLinkContaining("Next", { exact: true }) or clickLinkContaining()
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
        selector = "a"           // CSS selector for elements to check
    } = options;
    
    const elements = document.querySelectorAll(selector);
    
    for (const element of elements) {
        const elementText = element.textContent.trim();
        const textMatches = exact ? elementText === text : elementText.includes(text);
        
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
            
            console.log(`Found valid element with text "${text}", navigating to:`, element.href);
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
    
    console.log(`No valid element found with text: "${text}"`);
    return false;
}

// Function to click any button/link with specific text (case insensitive)
function clickElementWithText(text, options = {}) {
    const {
        selector = "a, button, [role=\"button\"]",  // Default to clickable elements
        exact = false,
        excludeClasses = [],
        excludeStyles = {}
    } = options;
    
    return clickLinkContaining(text, { selector, exact, excludeClasses, excludeStyles });
}

// Function to click the previous chapter/page link
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

// Function to click the next page/chapter link (generic)
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

// Export functions to window for global access
window.PostGrabActions = {
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
    pressSpace
};
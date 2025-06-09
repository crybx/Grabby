// Ctrl+click enhancer for sites with non-standard click handlers
// Automatically injected on specified sites via manifest.json

(function() {
    'use strict';
    
    let pendingNavigation = null;
    let isCapturingClick = false;
    let navigationBlocked = false;
    
    // Debug logging - write directly to extension storage with unique keys
    let logCounter = 0;
    function debugLog(message) {
        const timestamp = Date.now();
        const counter = ++logCounter;
        const logEntry = `[${new Date(timestamp).toISOString()}:${counter.toString().padStart(3, '0')}] ${message}`;
        
        // Remove console.log to prevent page console logging
        
        // Write directly to extension storage with unique keys
        try {
            const logKey = `grabby-log-${timestamp}-${counter}`;
            chrome.storage.local.set({[logKey]: logEntry});
        } catch (e) {
            // Silent failure for debug logging
        }
    }
    
    // Note: Page console functions don't work in isolated content script context
    
    // Test that the script is loading
    debugLog('Script initialization started');
    
    // Check if we just navigated from a Ctrl+click intent
    debugLog('Checking for navigation intent in browser session storage');
    try {
        const intentData = window.sessionStorage.getItem('grabby-navigation-intent');
        debugLog(`Browser session storage get result: ${intentData}`);
        
        if (intentData) {
            const intent = JSON.parse(intentData);
            const timeSinceIntent = Date.now() - intent.timestamp;
            debugLog(`Found navigation intent from ${timeSinceIntent}ms ago`);
            
            // Clear the intent IMMEDIATELY to prevent infinite loops
            window.sessionStorage.removeItem('grabby-navigation-intent');
            debugLog('Cleared navigation intent to prevent loops');
            
            // If the intent is recent (within 5 seconds) and we're on a chapter page
            if (timeSinceIntent < 5000 && window.location.href.includes('/books/') && 
                window.location.href !== intent.fromUrl) {
                
                const currentUrl = window.location.href;
                debugLog(`Handling Ctrl+click navigation: ${currentUrl}`);
                
                // Open current URL in new background tab (like real Ctrl+click)
                // Send message to background script to create the tab
                try {
                    chrome.runtime.sendMessage({
                        target: 'background',
                        type: 'openBackgroundTab',
                        url: currentUrl
                    });
                    debugLog(`Requested background tab for: ${currentUrl}`);
                } catch (error) {
                    // Fallback to window.open if messaging fails
                    window.open(currentUrl, '_blank');
                    debugLog(`Opened chapter in new tab (fallback): ${currentUrl}`);
                }
                
                // Go back to the original page
                window.history.back();
                debugLog('Navigated back to chapter list');
            } else {
                debugLog('Navigation intent expired or invalid');
            }
        } else {
            debugLog('No navigation intent found in browser session storage');
        }
    } catch (error) {
        debugLog(`Error checking navigation intent: ${error.message}`);
    }
    
    // All monitoring approaches have been proven ineffective and removed
    // (React fiber, Next.js router, history API, URL monitoring)
    
    // Main click handler for Ctrl+click
    function handleCtrlClick(event) {
        if (!event.ctrlKey) return;
        
        // Log that we detected ctrl+click
        debugLog('Ctrl+click detected on element: ' + event.target.tagName);
        
        const target = event.target;
        const readButton = target.closest('.cursor-pointer');
        
        if (!readButton) {
            debugLog('No cursor-pointer element found');
            return;
        }
        
        // Check if this looks like a read button
        const text = readButton.textContent.toLowerCase();
        debugLog(`Found cursor-pointer with text: "${text}"`);
        if (!text.includes('read')) {
            debugLog('Element does not contain "read" - ignoring');
            return;
        }
        
        debugLog('Processing Ctrl+click on Read button');
        
        // Get the chapter row to identify which chapter this is
        const chapterRow = readButton.closest('.flex.flex-row');
        if (!chapterRow) return;
        
        // Extract chapter info for identification
        const chapterNumElement = chapterRow.querySelector('.w-\\[5\\%\\]');
        const chapterNum = chapterNumElement ? chapterNumElement.textContent.replace(':', '').trim() : null;
        
        debugLog(`Attempting to capture URL for chapter ${chapterNum}`);
        debugLog(`Current URL at start: ${window.location.href}`);
        
        // Approach #1: Let navigation happen, capture URL, then go back and open in new tab
        debugLog('Trying normal click monitoring approach');
        
        // Don't prevent the event - let navigation happen normally
        // But set up monitoring first
        
        let navigationCaptured = false;
        const startUrl = window.location.href;
        
        // Set up beforeunload listener to capture destination
        const beforeUnloadHandler = function(e) {
            debugLog(`beforeunload fired - about to navigate from: ${window.location.href}`);
            
            // Store the navigation intent in browser session storage for the next page to handle
            try {
                const intentData = {
                    fromUrl: startUrl,
                    timestamp: Date.now(),
                    chapterNum: chapterNum
                };
                window.sessionStorage.setItem('grabby-navigation-intent', JSON.stringify(intentData));
                debugLog(`Stored navigation intent: ${JSON.stringify(intentData)}`);
            } catch (error) {
                debugLog(`Failed to store navigation intent: ${error.message}`);
            }
        };
        
        // Add the beforeunload listener
        window.addEventListener('beforeunload', beforeUnloadHandler, { once: true });
        
        // Set up a fallback timeout to clean up if navigation doesn't happen
        setTimeout(() => {
            window.removeEventListener('beforeunload', beforeUnloadHandler);
            if (!navigationCaptured) {
                debugLog(`No navigation captured for chapter ${chapterNum} after 2 seconds`);
            }
            isCapturingClick = false;
        }, 2000);
        
        debugLog('Set up navigation monitoring - allowing normal click to proceed');
    }
    
    // Add event listener for Ctrl+click with high priority
    document.addEventListener('click', handleCtrlClick, true);
    
    debugLog(`Ctrl+click enhancer loaded for ${window.location.hostname}`);
})();
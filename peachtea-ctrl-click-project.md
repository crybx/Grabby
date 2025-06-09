# PeachTea Agency Ctrl+Click Enhancement Project

## Project Goal

Enable Ctrl+click functionality on peachtea.agency to open chapter links in new tabs, bypassing the site's non-standard React/Next.js navigation that prevents normal browser behavior.

## Problem Description

**Website**: https://peachtea.agency  
**Issue**: Chapter links use `<div class="cursor-pointer">Read</div>` elements with React click handlers instead of proper anchor tags with href attributes. This prevents standard browser functionality like Ctrl+click to open in new tab.

**Chapter URL Pattern**: `https://peachtea.agency/books/{bookId}/{chapterUUID}`  
- Example: `https://peachtea.agency/books/5/6a1b000c-074c-4ed4-a14d-7d18dfe55d31`
- The UUID cannot be predicted and must be captured during navigation

## Technical Implementation

### Architecture
- **Browser Extension**: Grabby (Chrome Manifest V3)
- **Content Script**: `shift-click-enhancer.js` injected on `*://*.peachtea.agency/*`
- **Logging**: All debug logs stored in `chrome.storage.local` with unique keys

### Approach
1. **Event Detection**: Listen for Ctrl+click events on `.cursor-pointer` elements containing "read" text
2. **URL Capture**: Attempt to capture the chapter UUID through multiple methods:
   - React fiber tree analysis for component props
   - History API interception (pushState/replaceState)
   - URL monitoring via setInterval
   - Next.js router interception (if available)
3. **New Tab Opening**: Open captured URL in new tab using `window.open(url, '_blank')`

## Current Status: IN PROGRESS

### ✅ Working Components
- Extension manifest configuration for site-specific injection
- Ctrl+click event detection on "Read" buttons
- Debug logging system using extension storage
- Event prevention to stop default navigation
- React fiber analysis (no React keys found on elements)
- History API interception setup
- URL monitoring fallback system

### ❌ Known Issues

#### 1. **Property Override Errors** (RESOLVED)
- **Error**: `Cannot redefine property: href` and `Cannot assign to read only property 'assign'`
- **Cause**: Attempted to override read-only browser properties (`window.location.href`, `window.location.assign`)
- **Status**: Fixed by removing property override attempts
- **Date**: 2025-06-09

#### 2. **Console Logging** (RESOLVED)
- **Issue**: Debug logs appearing in page console instead of extension storage only
- **Status**: Fixed by removing all `console.log()` and `console.warn()` calls
- **Date**: 2025-06-09

#### 3. **URL Capture Failure** (ACTIVE)
- **Issue**: Script detects Ctrl+click but fails to capture the chapter URL
- **Root Cause**: The synthetic click event (without ctrlKey) triggers a full page reload rather than the expected client-side navigation

**Failed Approaches (Do NOT retry):**
- ❌ **React Fiber Analysis**: No React fiber keys found on clicked elements OR their parent elements (tested up 5 levels up the DOM tree)
- ❌ **Next.js Router Interception**: Next.js router not found in global scope
- ❌ **Direct Handler Search**: No onClick handlers found in React props or DOM onclick attributes (tested on clicked element and parents)
- ❌ **URL Monitoring**: URL never changes during navigation - synthetic click causes page reload
- ❌ **History API Interception**: pushState/replaceState not called during navigation
- ❌ **Location Property Override**: Browser properties are read-only (href, assign, replace)
- ❌ **Data Attributes**: No data-* attributes found on elements
- ❌ **UUID Mass Extraction**: 22k+ potential UUIDs found, mostly invalid, site rate limits prevent testing all

**Status**: Need completely different approach - all current methods trigger page reload instead of capturing URL

## Potential New Approaches to Try

### 1. Normal Click Monitoring (Let Navigation Happen) ✅ WORKING
- Don't prevent the click, let it navigate normally
- Use `beforeunload` to store navigation intent in `window.sessionStorage`
- On new page load, check for intent, open in new tab, go back
- **Fixed**: Clear intent immediately to prevent infinite loops
- **Status**: Successfully captures chapter URLs and opens in new tabs

### 2. Browser DevTools Protocol
- Use Chrome DevTools Protocol to monitor network traffic
- Capture navigation requests at the browser level
- Requires different extension permissions but might bypass content script limitations

### 3. MutationObserver for DOM Changes
- Monitor for any DOM changes during/after click
- Look for temporary elements that might contain URLs
- Sometimes React apps create temporary DOM nodes with navigation data

### 4. Iframe Navigation Interception
- Create hidden iframe, inject the click event there
- Monitor iframe navigation to capture URL
- Use that URL to open in new tab

### 5. Web Worker + Service Worker Combo
- Offload navigation capture to web worker
- Use service worker to intercept network requests
- Might bypass content script limitations

### 6. Browser History Mining
- After allowing navigation, immediately check browser history
- Extract the last entry before going back
- Requires history permissions

### 🔍 Investigation Findings

#### React Analysis
- No React fiber keys (`__reactInternalInstance`, `_reactInternalFiber`, `_reactInternals`) found on DOM elements
- React components may be using a different fiber structure or key naming
- Next.js router object not accessible via standard paths

#### Navigation Behavior
- Site uses client-side routing that may not trigger standard history API methods
- Navigation happens quickly, potentially before monitoring can capture it
- URL changes detected but capture timing may be inconsistent

## Test Results

### Latest Test (2025-06-09 18:36:09) - FINAL CLEAN VERSION
```
[2025-06-09T18:36:07.965Z:001] Script initialization started
[2025-06-09T18:36:07.965Z:002] Ctrl+click enhancer loaded for peachtea.agency
[2025-06-09T18:36:09.765Z:003] Ctrl+click detected on element: DIV
[2025-06-09T18:36:09.765Z:004] Found cursor-pointer with text: "read"
[2025-06-09T18:36:09.765Z:005] Processing Ctrl+click on Read button
[2025-06-09T18:36:09.765Z:006] Attempting to capture URL for chapter 105
[2025-06-09T18:36:09.765Z:007] Current URL at start: https://peachtea.agency/books/5
[2025-06-09T18:36:09.765Z:008] Prevented default event and stopped propagation
[2025-06-09T18:36:09.765Z:009] All current approaches have failed. Need new strategy for chapter 105
```

**Result**: 
- ✅ Event detection working perfectly (9 clean log entries)
- ✅ Failed approaches completely removed from code
- ✅ Script prevents default navigation (no page reload)
- ✅ Logging is now minimal and useful
- ❌ No URL capture method currently implemented

**Status**: Ready for new approach implementation

## Next Steps

1. **Investigate Navigation Method**: Determine how the site actually performs navigation
2. **Network Request Monitoring**: Try intercepting fetch/XMLHttpRequest calls for chapter URLs
3. **Timing Optimization**: Adjust URL monitoring intervals and timeouts
4. **Alternative React Analysis**: Search for React data in different locations/formats
5. **Manual UUID Extraction**: Explore extracting UUIDs from page data before navigation

## Files Modified

- `/mnt/r/repos/grabby/ctrl-click-enhancer.js` - Main content script (renamed from shift-click-enhancer.js)
- `/mnt/r/repos/grabby/manifest.json` - Added content script injection
- `/mnt/r/repos/grabby/background.js` - Added debug log handling and background tab creation
- `/mnt/r/repos/grabby/uuid-finder.js` - UUID search utility script

## Debugging

To view debug logs:
```javascript
// In browser console on any page:
chrome.runtime.sendMessage({target: 'background', type: 'getDebugLogs'});
```

To clear debug logs:
```javascript
chrome.runtime.sendMessage({target: 'background', type: 'clearDebugLogs'});
```
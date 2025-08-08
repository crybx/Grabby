# Grabby Development Setup

This guide helps you set up a development environment for Grabby, a Chrome extension for extracting and saving readable content from web pages.

## Prerequisites

- Chrome browser
- Node.js and npm
- IDE (WebStorm, VS Code, or similar)

## Initial Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Enable Chrome Extension development mode:**
    - Open Chrome and go to `chrome://extensions/`
    - Enable "Developer mode" in the top right
    - Click "Load unpacked" and select the Grabby directory

## IDE Setup for Chrome Extensions API

### WebStorm Setup

The project includes Chrome Extension API types for full IntelliSense support:

1. **Types are already installed** via `@types/chrome` in `package.json`
2. **Configuration is set** in `jsconfig.json`
3. **Additional WebStorm settings:**
    - Go to **File → Settings → Languages & Frameworks → JavaScript**
    - Set **JavaScript language version** to "ES2022"
    - Under **Libraries**, ensure "Chrome Extensions" is added

### VS Code Setup

VS Code will automatically use the `jsconfig.json` and `@types/chrome` for IntelliSense.

### What You Get

After setup, your IDE will provide:
- **Autocomplete** for `chrome.tabs.*`, `chrome.storage.*`, `chrome.runtime.*`, etc.
- **Parameter hints** showing required arguments and types
- **Type checking** to catch errors before runtime
- **Documentation** on hover for Chrome API methods
- **Accurate deprecation warnings** for outdated APIs

### Test Your Setup

Try typing `chrome.` in any JavaScript file - you should see comprehensive autocomplete with all Chrome Extension APIs.

## Development Workflow

### Code Style and Linting

The project uses ESLint with specific style rules:

```bash
# Check code style
npm run lint

# Auto-fix style issues
npm run lint:fix
```

**Style rules:**
- 4-space indentation
- Double quotes for strings
- Semicolons required
- Proper spacing around keywords and functions

### Testing Changes

1. **Make code changes**
2. **Run linting:** `npm run lint`
3. **Reload extension:**
    - Go to `chrome://extensions/`
    - Click the refresh button on Grabby
4. **Test on target websites**

### Bulk Grabbing Development

The bulk grabbing system uses:
- **Session storage** (clears on browser restart)
- **Tab-specific state** (multiple concurrent sessions supported)
- **Chrome alarms API** for scheduling
- **Service worker persistence** across restarts

To debug bulk grabbing:
1. Open Chrome DevTools on the extension's service worker
2. Check `chrome.storage.session` for state
3. Monitor console logs for operation flow

### Story Tracker Development

The story tracking system provides:
- **Persistent story tracking** across browser sessions
- **Automatic chapter detection** when grabbing tracked stories
- **Queue management** for processing multiple stories
- **Real-time progress updates** in the UI
- **Pause/resume/cancel controls** for queue operations

Key components:
- `story-tracker.html` - Main tracking interface
- `story-tracker-table.js` - UI logic and queue management
- `modules/queue-manager.js` - Backend queue processing
- Storage uses `chrome.storage.local` for persistence

To debug story tracking:
1. Open the Story Tracker page from the extension popup
2. Check DevTools → Application → Storage → Local Storage
3. Monitor console for queue operations and updates

## Common Development Tasks

### Adding a New Website Grabber

1. Add grabber function to `content-scripts/grabbers.js`:
   ```js
   function grabNewSite() {
       const title = document.querySelector("h1").textContent;
       const content = document.querySelector(".content").innerHTML;
       return { title, content };
   }
   ```

2. Add site configuration to `website-configs.js`:
   ```js
   "newsite.com": {
       grabber: "grabNewSite",
       // Optional: Add actions for content processing
       actions: ["GrabActions.methodName"]
   }
   ```

3. Run `npm run lint` to check style
4. Test on the target website

Note: Grabber functions are accessed via script injection by the service worker or included via script tags in HTML pages. They don't need explicit exports.

### Adding Site-Specific CSS

1. Create CSS file in `styles/` directory
2. Add content script entry to `manifest.json`:
   ```json
   {
     "matches": ["*://*.example.com/*"],
     "css": ["styles/example.css"]
   }
   ```

### Debugging Tips

- **Service Worker DevTools:** `chrome://extensions/` → Grabby → "service worker" link
- **Content Script DevTools:** Regular F12 on the target page
- **Popup DevTools:** Right-click popup → "Inspect"
- **Story Tracker DevTools:** Open Story Tracker page → F12
- **Storage Inspection:** 
  - Session Storage: Temporary bulk grab states
  - Local Storage: Persistent story tracking data

## Project Structure

```
grabby/
├── manifest.json              # Extension configuration
├── background.js              # Main service worker coordinator
├── website-configs.js         # Centralized site configurations
├── modules/                   # Background script modules (ES6 modules)
│   ├── script-injector.js     # Script injection handling
│   ├── bulk-grab-manager.js   # Bulk operations management
│   ├── queue-manager.js       # Multi-story queue processing
│   └── download-handler.js    # File download management
├── content-scripts/           # Scripts injected into web pages
│   ├── grabber-core.js        # Main extraction logic
│   ├── grabbers.js            # Site-specific grabber functions
│   ├── utils.js               # DOM cleaning utilities
│   ├── grab-actions.js        # Content processing hooks
│   ├── grabby-button.js       # Floating clipboard button
│   └── story-tracker.js       # Story tracking injection
├── popup.html                 # Extension popup UI
├── popup.js                   # Popup logic
├── story-tracker.html         # Story tracking management page
├── story-tracker-table.js     # Story tracker UI logic
├── styles/                    # Site-specific and UI styles
│   ├── grabby.css             # Global extension styles
│   ├── popup.css              # Popup UI styles
│   ├── story-tracker.css      # Story tracker styles
│   └── [site-specific].css   # Various site-specific styles
├── images/                    # Extension assets
├── package.json               # Dependencies and scripts
├── jsconfig.json              # IDE JavaScript configuration
├── .eslintrc.js               # Code style rules
├── LICENSE.md                 # GNU GPL v3 License
├── README.md                  # User documentation
└── DEV_SETUP.md               # This development guide
```

## Troubleshooting

### IDE Not Showing Chrome API Autocomplete

1. Verify `@types/chrome` is installed: `npm list @types/chrome`
2. Check `jsconfig.json` exists and includes `"types": ["chrome"]`
3. Restart your IDE
4. For WebStorm: Check Libraries settings include Chrome Extensions

### Extension Not Loading

1. Check `manifest.json` syntax with JSON validator
2. Look for errors in Chrome Extensions page
3. Check service worker console for JavaScript errors
4. Verify all file paths in manifest exist

### Linting Errors

```bash
# See all errors
npm run lint

# Auto-fix what's possible
npm run lint:fix

# Common issues:
# - Use double quotes, not single
# - 4-space indentation
# - Add semicolons
# - Add spaces around keywords
```
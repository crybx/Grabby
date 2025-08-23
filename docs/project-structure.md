# Project Structure

This document describes the organization of the Grabby Chrome extension codebase.

## Core Files

- **`manifest.json`** - Chrome extension configuration and permissions
- **`background.js`** - Main service worker that coordinates all modules
- **`website-configs.js`** - Centralized configuration for supported websites
- **`package.json`** - Node.js dependencies and npm scripts
- **`jsconfig.json`** - IDE configuration for JavaScript development
- **`.eslintrc.js`** - Code style and linting rules

## Modules Directory

Background script modules using ES6 module syntax:

- **`script-injector.js`** - Handles content script injection
- **`bulk-grab-manager.js`** - Manages bulk grabbing operations
- **`queue-manager.js`** - Processes multiple stories in queue
- **`download-handler.js`** - Handles file downloads and naming

## Content Scripts Directory

Scripts injected into web pages:

- **`grabber-core.js`** - Main extraction logic and website detection
- **`grabbers.js`** - Site-specific extraction functions
- **`utils.js`** - DOM utilities for cleaning HTML content
- **`grab-actions.js`** - Content processing hooks and filters
- **`grabby-button.js`** - Floating clipboard button for all pages
- **`story-tracker.js`** - Story tracking data storage interaction

## Pages Directory

Extension UI pages and their scripts:

- **`popup.html`** / **`popup.js`** - Extension popup interface
- **`options.html`** / **`options.js`** - Extension settings/about page
- **`story-tracker.html`** - Story tracking management interface
- **`story-tracker-table.js`** - Story tracker table logic with pagination

## Styles Directory

CSS files for UI and site-specific styling:

- **`grabby.css`** - Global extension styles
- **`popup.css`** - Popup interface styles
- **`options.css`** - Options page styles
- **`story-tracker.css`** - Story tracker interface styles
- **`grabby-button.css`** - Floating button styles
- **Site-specific CSS files** - Custom styles for various websites (e.g., `wordpress.css`)

## Images Directory

Extension assets:

- **`clipboard128.png`** - Main extension icon
- Various icon sizes and assets

## EPub Directory

WebToEpub integration (embedded as a library):

- **`popup.html`** - WebToEpub interface (accessed via Grabby popup)
- **`js/`** - WebToEpub JavaScript including website parsers
- **`css/`** - WebToEpub styles and themes
- **`unitTest/`** - WebToEpub test files
- **`@zip.js/`** - ZIP library for EPUB creation (via npm)
- **`dompurify/`** - HTML sanitization library (via npm)

## Documentation

- **`README.md`** - Main user documentation
- **`LICENSE.md`** - GNU GPL v3 license
- **`docs/`** - Additional documentation
  - **`DEVELOPERS.md`** - Development setup guide
  - **`extension-id.md`** - Extension ID documentation
  - **`project-structure.md`** - This file

## Key Architectural Patterns

### Message Passing
- Background script (`background.js`) acts as central coordinator
- Content scripts communicate via Chrome runtime messages
- Modules use ES6 imports for code organization

### Website Support
- Site configurations centralized in `website-configs.js`
- Grabber functions in `grabbers.js` handle extraction
- Site-specific CSS injected via manifest content scripts

### Storage
- Stories tracked using `chrome.storage.local`
- Each story stored with unique key (`story_${id}`)
- Settings use `chrome.storage.local` with specific keys

### File Organization
- Separation of concerns: modules, content scripts, UI pages
- ES6 modules for background scripts
- Traditional scripts for content injection
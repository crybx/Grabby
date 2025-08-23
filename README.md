# Grabby

A Chrome extension that saves web pages as clean, readable files and tracks your reading progress across ongoing stories.

<a href='https://ko-fi.com/crybx' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

> **⚠️ Alpha Version**: This extension is in active development. While I use it extensively daily, 
> you may encounter bugs or incomplete features. If you find any issues or have suggestions, please
> [report them here](https://github.com/crybx/Grabby/issues).

## Features

- **One-click content download** - Save any web page as a clean, readable file with Alt+G or the floating clipboard button
- **Story tracking** - Track your reading progress across ongoing web serials and stories
- **Bulk grabbing** - Download entire stories or selected chapter ranges automatically
- **Queue management** - Process multiple stories simultaneously with pause/resume controls
- **Site-specific extraction** - Custom logic for 50+ sites, plus WebToEpub parser fallback for 500+ additional sites
- **Content cleaning** - Removes ads, navigation, and other clutter
- **File naming** - Consistent naming pattern with chapter numbers and story titles
- **Epub creation** - Embedded [WebToEpub-Codex](https://github.com/crybx/WebToEpub-Codex) for converting web stories to epub format

## Installation

### Development Build

For users comfortable with developer mode who want the latest features and bug fixes:

**Latest Development Release**: https://github.com/crybx/Grabby/releases/tag/latest-dev

1. Download the ZIP file from the latest-dev release
2. Extract the ZIP file to a folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right corner
5. Click "Load unpacked" and select the extracted folder

### Chrome Web Store

For users who prefer automatic updates and standard installation:

[Grabby on the Chrome Web Store](https://chromewebstore.google.com/detail/grabby/inibchdkflhanjekaochnidojoienfbp)

Easiest installation with automatic updates, but may be behind on bug fixes due to store review process (reviews can take up to a week).

### From Source

For developers or those who want to modify the extension:

1. Clone this repository: `git clone https://github.com/crybx/Grabby.git`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the repository folder

**Note**: The development build and source versions will have different extension IDs than the store version, so they can be installed alongside each other.

## Usage

### Quick Grab
- **Keyboard shortcut**: Press `Alt+G` on any page
  - To customize or update: Go to `chrome://extensions/shortcuts` in your browser
  - You may need to set or change the shortcut if it conflicts with another extension or a previous development version of Grabby
- **Floating button**: Use the clipboard icon (<img src="images/clipboard128.png" width="16" height="16" style="vertical-align: middle">) that appears in the top-right corner of web pages
- **Extension popup**: Click the Grabby icon in your toolbar, then click the clipboard icon in the popup

### Story Tracking
1. Click the Grabby icon and select "Open Story Tracker"
2. Add stories you want to track
3. Your reading progress updates automatically when you grab chapters
4. Use the queue system to check multiple stories for new chapters (if autoNav is supported for the sites)

### Bulk Grabbing
1. Navigate to any chapter of a story
2. Click "Start Bulk Grab" from the extension popup
3. Choose how many chapters to grab
4. Grabby will automatically navigate and download chapters (if autoNav is supported for the site)

### Epub Creation
1. Navigate to any webpage or story you want to convert
2. Click "Create Epub" from the extension popup
3. Use the embedded WebToEpub-Codex interface to:
   - Parse and extract content from supported websites
   - Customize metadata, cover images, and formatting
   - Generate epub files for e-readers
   - Access WebToEpub-Codex fork features

*Note: Bulk grabbing and automatic new chapter checking require site-specific configuration. (More details below.)
These features are available for sites with navigation support. Single-page grabbing works on any webpage and epub creation does not require navigation support.

## Supported Sites

**Grabby works on any webpage** - even local files opened in your browser. It uses a multi-tiered extraction approach:

### Sites with Custom Support
Grabby includes custom extraction logic for specific sites:
- Fiction platforms (Webnovel, Tapas, Syosetu, etc.)
- Fan fiction sites (AO3, FanFiction.com, etc.)
- Fan translation sites
- Various web serial hosts and blogs (WordPress)
- See [website-configs.js](website-configs.js) for the full list.

### WebToEpub Parser Fallback
When no custom support exists, Grabby uses [WebToEpub's](https://github.com/dteviot/WebToEpub) parser library for additional sites including community-maintained parsers for both popular and niche sites.

### Sites with Bulk Grab & Auto-Check Support require automatic navigation configuration
For sites with navigation support, look for ones with `autoNav: { enabled: true }` in their configuration.

### General Extraction
For other webpages, Grabby extracts the main text while removing ads and navigation. This works for:
- News articles and blog posts
- Documentation and wikis
- Local HTML files (useful for grabbing Chrome's automatic Google Translate translations)
- Most text-heavy webpages

## Privacy & Security

### What Grabby Does
- **Saves content locally** - All grabbed content is saved to your downloads folder
- **No data collection** - Grabby does not collect, transmit, or store any user data or browsing information
- **No external servers** - Everything happens locally in your browser
- **Respects access restrictions** - Grabby only accesses pages exactly as your browser sees them:
  - If you need to be logged in to view content, you still need to be logged in
  - If content is behind a paywall, you still need proper access
  - Grabby does not circumvent any access restrictions or paywalls

### Required Permissions
Grabby requests these Chrome permissions:
- **activeTab** - To access the current tab's content when you trigger a grab
- **alarms** - To schedule bulk grab operations
- **cookies** - To access login-protected content and handle site authentication (epub creation)
- **declarativeNetRequest** - To handle complex site interactions (epub creation)
- **downloads** - To save grabbed content to your computer
- **scripting** - To inject content extraction scripts
- **storage** - To save your story tracking data and extension settings
- **tabs** - To manage tab operations for bulk grabbing and epub creation
- **unlimitedStorage** - For large epub files and story tracking data
- **webRequest** - To monitor and modify network requests for content extraction (epub creation)

## Development

To contribute or customize Grabby, check the [Development Setup Guide](docs/DEVELOPERS.md) for instructions on:
- Setting up your development environment
- Adding support for new websites
- Understanding the codebase structure
- Running tests and linting

## Support

If you find Grabby useful, consider supporting the project:

<a href='https://ko-fi.com/crybx' target='_blank'><img height='36' style='border:0px;height:36px;' src='https://storage.ko-fi.com/cdn/kofi1.png?v=6' border='0' alt='Buy Me a Coffee at ko-fi.com' /></a>

## License

```
Grabby, a browser extension that saves web pages as clean, readable files 
and tracks your reading progress across ongoing stories.
Copyright (C) 2024  crybx

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
```
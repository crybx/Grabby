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
- **Smart extraction** - Custom extraction logic for 50+ fiction and novel sites
- **Cleans output** - Automatically removes ads, navigation, and other clutter
- **Structured file naming** - Consistent naming pattern with chapter numbers and story titles for easy searching and identification

## Installation

### From Source (Current Method)

1. Download or clone this repository
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the repository folder
5. The Grabby icon should appear in your extensions bar

### Chrome Web Store
*Coming soon - pending submission and review*

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
4. Use the queue system to check multiple stories for new chapters*

### Bulk Grabbing
1. Navigate to any chapter of a story
2. Click "Start Bulk Grab" from the extension popup
3. Choose how many chapters to grab
4. Grabby will automatically navigate and download chapters*

*Note: Bulk grabbing and automatic new chapter checking require site-specific configuration. (More details below.)
These features are available for sites with navigation support. Single-page grabbing works on any webpage.

## Compatibility

**Grabby works on any webpage** - even local files opened in your browser. While 
it includes custom extraction logic for 50+ sites for better results on those sites,
Grabby will attempt to extract and clean content from any page you're viewing.

### Sites with Custom Support
- Fiction platforms (Webnovel, Tapas, Syosetu, etc.)
- Fan fiction sites (AO3, FanFiction.com, etc.)
- Fan translation sites
- Various web serial hosts and blogs (WordPress)
- See [website-configs.js](website-configs.js) for the full list.

### Sites with Bulk Grab & Auto-Check Support
For sites with navigation support, look for ones with `autoGrab: { enabled: true }` in their configuration.

### Universal Extraction
For any other webpage, Grabby does its best to extract the main text while removing ads, navigation, and other clutter. This works for:
- News articles and blog posts
- Documentation and wikis
- Local HTML files (useful for grabbing Chrome's automatic Google Translate translations)
- Pretty much any text-heavy webpage

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
- **storage** - To save your story tracking data and extension settings
- **downloads** - To save grabbed content to your computer
- **alarms** - To schedule bulk grab operations
- **scripting** - To inject content extraction scripts

## Development

To contribute or customize Grabby, check the [Development Setup Guide](DEV_SETUP.md) for instructions on:
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
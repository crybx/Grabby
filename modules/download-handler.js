// DownloadHandler - Handles download prep and file downloads
export class DownloadHandler {
    // Process and download content
    async processAndDownload(data) {
        let content = data.content;
        let title = data.title;
        let matchingConfig = data.matchingConfig;
        let titleFromParser = data.titleFromParser;
        let url = data.url;

        try {
            const filename = this.createFileName(title, titleFromParser, url, matchingConfig);
            const processedContent = this.processContent(content);

            // Create HTML from content
            const htmlContent = this.getHtmlFromContent(filename, processedContent);

            await this.downloadAsFile(filename, htmlContent);

            // Return the filename for story tracker
            return { success: true, filename: filename };
        } catch (error) {
            console.error("Error processing and downloading content:", error);
            console.error("Title was:", title, "URL was:", url);
            return { success: false };
        }
    }

    processContent(content) {
        // Replace </p><p with </p>\n\n<p for better readability
        content = content.replace(/<\/p><p/g, "</p>\n\n<p");
        
        // Convert void HTML elements to self-closing XHTML format
        // List of void elements that should be self-closing in XHTML
        const voidElements = ["area", "base", "br", "col", "embed", "hr", "img", "input", 
            "link", "meta", "param", "source", "track", "wbr"];
        
        // Create regex pattern for all void elements
        const voidPattern = new RegExp(`<(${voidElements.join("|")})(\\s[^>]*)?>`, "gi");
        
        content = content.replace(voidPattern, (match, tagName, attributes) => {
            // Skip if already self-closing
            if (match.endsWith("/>")) {
                return match;
            }
            // Convert to self-closing
            if (attributes) {
                // Has attributes, insert / before >
                return `<${tagName}${attributes}/>`;
            } else {
                // No attributes
                return `<${tagName}/>`;
            }
        });

        return content;
    }
    
    // Generate HTML from content
    getHtmlFromContent(title, bodyText) {
        return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link type="text/css" rel="stylesheet" href="../styles/stylesheet.css"/>
</head>
<body>
${bodyText}
</body>
</html>`;
    }

    createFileName(title, titleFromParser, url, matchingConfig) {
        // Use WebToEpub title if available, otherwise use the extracted title
        let filename = titleFromParser || title;

        // Apply domain-specific cleanup patterns from config
        if (matchingConfig?.filenameCleanupPatterns && Array.isArray(matchingConfig.filenameCleanupPatterns)) {
            for (const pattern of matchingConfig.filenameCleanupPatterns) {
                filename = filename.replace(new RegExp(pattern, "g"), "");
            }
        }

        // Add domain to filename
        const domain = new URL(url).hostname;
        filename = `${filename}_${domain}`;
        
        // Clean up the filename
        // # and , are not illegal, but they are annoying
        let illegalWindowsFileNameRegex = /[<>:"#!/\\|?*]/g;
        filename = filename.replace(illegalWindowsFileNameRegex, "");

        // Remove zero-width and other invisible Unicode characters
        // eslint-disable-next-line no-misleading-character-class
        filename = filename.replace(/[\u200B-\u200D\uFEFF\u00AD\u034F\u061C\u115F\u1160\u17B4\u17B5\u180B-\u180E\u2000-\u200F\u202A-\u202F\u205F-\u2064\u206A-\u206F\u3000\u2800\uFFA0\u3164]/g, "");

        // remove any other whitespace
        filename = filename.replace(/\s/g, "_");
        // replace . with _ in the filename
        filename = filename.replace(/\./g, "_");
        // replace comma with nothing
        filename = filename.split(",").join("");
        // collapse multiple consecutive underscores to single underscore
        filename = filename.replace(/_+/g, "_");
        filename = filename + ".html";
        
        return filename;
    }

    async downloadAsFile(filename, htmlContent) {
        // Convert HTML content to data URL for download
        // Service workers can't use blob URLs, so we use data URLs
        // Use TextEncoder for proper Unicode handling
        const encoder = new TextEncoder();
        const data = encoder.encode(htmlContent);
        
        // Convert to base64 in chunks to avoid stack overflow with large content
        let binary = "";
        const chunkSize = 8192; // Process 8KB at a time
        for (let i = 0; i < data.length; i += chunkSize) {
            const chunk = data.slice(i, i + chunkSize);
            binary += String.fromCharCode.apply(null, chunk);
        }
        const base64 = btoa(binary);
        const dataUrl = `data:text/html;base64,${base64}`;
        
        let options = {
            url: dataUrl,
            filename: filename,
            saveAs: false
        };

        await chrome.downloads.download(options);
    }
}
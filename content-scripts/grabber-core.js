// Website configurations are now in website-configs.js

function getTitleFromFirstHeading(content) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(content, "text/html");
    return doc.querySelector("h1").textContent;
}

function extractTitle(content, useFirstHeadingTitle) {
    if (useFirstHeadingTitle) {
        return getTitleFromFirstHeading(content);
    }
    return document.querySelector("title")?.textContent ||
        document.querySelector("h1")?.textContent ||
        "chapter";
}

function handleLocalFile(url) {
    const filename = url.split("/").pop().split(".").slice(0, -1).join(".");
    const content = grabLocalFile();
    return { filename, content };
}

async function grabFromWebsite() {
    const url = window.location.href;
    let filename, content;

    try {
        if (url.includes("file://")) {
            ({ filename, content } = handleLocalFile(url));
        } else {
            const config = findMatchingConfig(url);

            if (config) {
                // Run pre-grab function if it exists
                if (config.preGrab && typeof config.preGrab === "function") {
                    try {
                        const preGrabResult = await config.preGrab();
                        
                        // Check if preGrab returned an abort signal
                        if (preGrabResult && preGrabResult.abort) {
                            console.log("Pre-grab function requested abort:", preGrabResult.reason || "No reason provided");
                            
                            // Send message to stop bulk grabbing if it's running
                            chrome.runtime.sendMessage({
                                target: "background",
                                type: "stopBulkGrab"
                            });
                            
                            // Show user-friendly error message
                            chrome.runtime.sendMessage({
                                target: "background",
                                type: "showError",
                                message: preGrabResult.reason || "Content grab was aborted by pre-grab check"
                            });
                            
                            return null; // Abort the grab
                        }
                    } catch (preGrabError) {
                        console.error("Error in pre-grab function:", preGrabError);
                    }
                }

                try {
                    content = config.grabber();
                } catch (grabError) {
                    console.error(`Error in grabber for ${url}:`, grabError);
                    content = grabStandard()(); // Fallback to generic grabber
                }
                filename = extractTitle(content, config.useFirstHeadingTitle);
            } else {
                content = grabStandard()();
                filename = extractTitle(content, false);
                console.log("This website is not specifically supported: ", url);
            }

            // append domain name to the filename for easier search
            const domain = new URL(url).hostname;
            filename = `${filename}_${domain}`;
        }

        if (!content || content.trim() === "") {
            throw new Error("No content could be extracted from this page");
        }

        // Run post-grab function if it exists
        if (!url.includes("file://")) {
            const config = findMatchingConfig(url);
            if (config && config.postGrab && typeof config.postGrab === "function") {
                try {
                    const postGrabResult = await config.postGrab();
                    
                    // Check if postGrab returned an abort signal
                    if (postGrabResult && postGrabResult.abort) {
                        console.log("Post-grab function requested abort:", postGrabResult.reason || "No reason provided");
                        
                        // Send message to stop bulk grabbing if it's running
                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "stopBulkGrab"
                        });

                        // Show user-friendly message
                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "showError",
                            message: postGrabResult.reason || "Bulk grab stopped by post-grab check"
                        });
                        
                        // Note: We don't return null here since the grab itself was successful
                        // We just want to stop future grabs in a bulk operation
                    }
                } catch (postGrabError) {
                    console.error("Error in post-grab function:", postGrabError);
                }
            }
        }

        return { filename, content };

    } catch (error) {
        console.error("Error grabbing content:", error);
        // Consider showing a user-friendly error notification
        chrome.runtime.sendMessage({
            target: "background",
            type: "showError",
            message: `Failed to grab content: ${error.message}`
        });
        return null;
    }
}

function getFileBlobFromContent(title, bodyText) {
    let blobText = getHtmlFromContent(title, bodyText);
    return new Blob([blobText], {type: "text/html"});
}

function getHtmlFromContent(title, bodyText) {
    return `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link type="text/css" rel="stylesheet" href="../styles/stylesheet.css"/>
</head>
<body>
${bodyText}
</body>
</html>
    `;
}

function copyToClipboard(text) {
    // Seeing and being able to copy the result from
    // the console when things go wrong is very handy.
    console.log(text);

    // Create a textbox field where we can insert text to.
    let copyFrom = document.createElement("textarea");

    // Set the text content to be the text you wished to copy.
    copyFrom.textContent = text;

    // Append the textbox field into the body as a child.
    document.body.appendChild(copyFrom);

    // Select all the text!
    copyFrom.select();

    // Execute command
    document.execCommand("copy");

    // (Optional) De-select the text using blur().
    copyFrom.blur();

    // Remove the textbox field from the document.body
    document.body.removeChild(copyFrom);
}

async function handleContentDownload(filename, content) {
    let blobUrl;
    try {
        copyToClipboard(content);

        const blob = getFileBlobFromContent(filename, content);
        blobUrl = URL.createObjectURL(blob);

        await chrome.runtime.sendMessage({
            target: "background",
            type: "downloadAsFile",
            title: filename,
            blobUrl: blobUrl,
            cleanup: () => URL.revokeObjectURL(blobUrl)
        });

        // Update story tracker with the grabbed content
        chrome.runtime.sendMessage({
            target: "background",
            type: "updateStoryTracker",
            url: window.location.href,
            title: filename
        });

        // Show feedback to user
        const notification = document.createElement("div");
        notification.textContent = "Content grabbed!";
        notification.classList.add("notification");
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 3000);

        return true;
    } catch (error) {
        console.error("Error downloading content:", error);
        URL.revokeObjectURL(blobUrl);
        return false;
    } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl);
    }
}


// Export functions for use in other files
window.GrabbyCore = {
    grabFromWebsite,
    handleContentDownload
};

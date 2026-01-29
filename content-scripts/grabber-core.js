/**
 * Try to use a WebToEpub parser for the given URL
 * @param {string} url - The URL to check for parser support
 * @returns {Promise<{title: string, content: string}|null>} - Parser result or null if no parser found
 */
async function tryWebToEpubParser(url) {
    try {
        // Use the globally available PARSER_REGISTRY (injected via content script)
        let domain = new URL(url).hostname;
        // Strip www. prefix to match registry entries
        if (domain.startsWith("www.")) {
            domain = domain.substring(4);
        }
        const parserInfo = PARSER_REGISTRY[domain];
        if (!parserInfo) {
            return null;
        }
        
        console.log(`Found WebToEpub parser for ${domain}: ${parserInfo.parserClass}`);

        // Request background script to inject WebToEpub infrastructure and parser
        await chrome.runtime.sendMessage({
            target: "background",
            type: "injectWebToEpubParser",
            parserInfo: parserInfo
        });
        
        // Wait a bit for injection to complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // Use parserFactory to get the parser instance
        // This avoids the need to resolve class names since parserFactory has the constructors
        let parser = null;
        try {
            if (typeof parserFactory !== "undefined" && parserFactory.fetchByUrl) {
                parser = parserFactory.fetchByUrl(window.location.href);
            }
        } catch (e) {
            console.log("Error using parserFactory:", e);
        }
        
        if (!parser) {
            console.log("Parser not found via parserFactory, waiting longer...");
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            try {
                if (typeof parserFactory !== "undefined" && parserFactory.fetchByUrl) {
                    parser = parserFactory.fetchByUrl(window.location.href);
                }
            } catch (e) {
                console.log("Error using parserFactory after wait:", e);
            }
            
            if (!parser) {
                throw new Error(`Parser for ${window.location.href} not available after injection`);
            }
        }
        
        // Execute the parser instance directly
        return parser.extractGrabbyFormat(document);
    } catch (error) {
        console.error("Error trying WebToEpub parser:", error);
        return null;
    }
}

// Extract title based on configuration
function extractTitle(content, useFirstHeadingTitle) {
    if (useFirstHeadingTitle) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(content, "text/html");
        const titleFromHeading = doc.querySelector("h1")?.textContent;
        if (titleFromHeading) {
            return titleFromHeading;
        }
    }
    return document.querySelector("title")?.textContent ||
           document.querySelector("h1")?.textContent ||
           "Chapter";
}

// Helper function to handle grab interruptions (aborts, errors, end of story, etc.)
function handleGrabInterruption(message) {
    // Send single message to handle all interruption actions
    chrome.runtime.sendMessage({
        target: "background",
        type: "stopGrabbing",
        url: window.location.href,
        status: message
    }).then();
}

async function grabFromWebsite(isBulkGrab = false) {
    const url = window.location.href;
    let content, titleFromParser;

    try {
        const matchingConfig = findMatchingConfig(url);

        if (url.includes("file://")) {
            content = grabLocalFile();
        } else if (matchingConfig) {
            // Resolve function references to actual functions
            const config = resolveConfigFunctions(matchingConfig, {
                grabbers: window, // All grabber functions are in global scope
                GrabActions: window.GrabActions
            });

            // Run pre-grab function if it exists and conditions are met
            // Default to true if runActionsOnDirectGrab is not specified
            const configAllowsDirectActions = config.runActionsOnDirectGrab !== false;
            const shouldRunActions = isBulkGrab || configAllowsDirectActions;

            if (config.preGrab && typeof config.preGrab === "function" && shouldRunActions) {
                try {
                    const preGrabResult = await config.preGrab();

                    // Check if preGrab returned an abort signal
                    if (preGrabResult && preGrabResult.abort) {
                        console.log("Pre-grab function requested abort:", preGrabResult.reason || "No reason provided");

                        handleGrabInterruption(preGrabResult.reason || "Aborted by pre-grab check");

                        return null; // Abort the grab
                    }
                } catch (preGrabError) {
                    console.error("Error in pre-grab function:", preGrabError);
                }
            }

            try {
                const grabResult = await config.grabber();

                // Check if grabber returned an abort signal
                if (grabResult && typeof grabResult === "object" && grabResult.abort) {
                    console.log("Grabber requested abort:", grabResult.reason || "No reason provided");
                    handleGrabInterruption(grabResult.reason || "Aborted by grabber");
                    return null;
                }

                content = grabResult;
            } catch (grabError) {
                console.error(`Error in grabber for ${url}:`, grabError);
                content = grabStandard()(); // Fallback to generic grabber
            }
        } else {
            // Check if WebToEpub parser exists for this domain
            const epubParserResult = await tryWebToEpubParser(url);

            if (epubParserResult) {
                content = epubParserResult.content;
                titleFromParser = epubParserResult.title;
                console.log("Used WebToEpub parser for:", url);
            } else {
                content = grabStandard()();
                console.log("This website is not specifically supported: ", url);
            }
        }

        if (!content || content.trim() === "") {
            console.error("No content could be extracted from this page");
            handleGrabInterruption("No content could be extracted from this page");
            return;
        }

        copyToClipboard(content);
        
        // Extract title based on config
        const title = extractTitle(content, matchingConfig?.useFirstHeadingTitle);

        // Sanitize content with DOMPurify before sending to background
        let cleanContent;
        try {
            cleanContent = DOMPurify.sanitize(content);
        } catch (e) {
            console.error("Failed to sanitize content:", e);
            handleGrabInterruption("Content sanitization failed - aborting for security");
            return;
        }

        // Send content and config to background for processing and download
        await chrome.runtime.sendMessage({
            target: "background",
            type: "processAndDownload",
            data: {
                content: cleanContent,
                matchingConfig,
                title,
                titleFromParser,
                url
            }
        });

        // Run post-grab function if it exists and conditions are met
        if (!url.includes("file://")) {
            // Default to true if runActionsOnDirectGrab is not specified
            const configAllowsDirectActions = matchingConfig?.runActionsOnDirectGrab !== false;
            const shouldRunActions = isBulkGrab || configAllowsDirectActions;
            
            if (matchingConfig?.postGrab && shouldRunActions) {
                try {
                    // Resolve function references
                    const config = resolveConfigFunctions(matchingConfig, {
                        grabbers: window,
                        GrabActions: window.GrabActions
                    });
                    const postGrabResult = await config.postGrab();
                    
                    // Check if postGrab returned an abort signal
                    if (postGrabResult && postGrabResult.abort) {
                        console.log("Post-grab function requested abort:", postGrabResult.reason || "No reason provided");
                        handleGrabInterruption(postGrabResult.reason || "Aborted by post-grab check");
                    }
                } catch (postGrabError) {
                    console.error("Error in post-grab function:", postGrabError);
                }
            }
        }
    } catch (error) {
        console.error("Error grabbing content:", error);
        handleGrabInterruption(`Error: ${error.message}`);
    }
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

// Export functions for use in other files
window.GrabbyCore = {
    grabFromWebsite
};
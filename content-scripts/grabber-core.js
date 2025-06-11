// Website configurations
// Each site config can have:
// - grabber: function to extract content (required)
// - useFirstHeadingTitle: boolean to use first <h1> as title (optional)
// - preGrab: function to run before grabbing content (optional)
// - postGrab: function to run after grabbing content (optional)
//
// Example usage:
// "example.com": { 
//     grabber: grabExample,
//     useFirstHeadingTitle: true,
//     preGrab: PreGrabActions.scrollToBottom,  // Pre-grab actions
//     postGrab: PostGrabActions.clickLinkContaining("Next", { exact: true })  // Post-grab actions
// }
const WEBSITE_CONFIGS = {
    // Grabbers for single domains
    singleDomains: {
        "archiveofourown.org": { grabber: grabAO3, useFirstHeadingTitle: true },
        "blogspot.com": { grabber: grabBlogspot },
        "chrysanthemumgarden.com": { grabber: grabChrysanthemum },
        "darkstartranslations.com": { grabber: grabStandard(".chapter-content") },
        "docs.google.com": { grabber: grabGoogleDocMobileBasic },
        "fanfiction.ws": { grabber: grabStandard(".storytext") },
        "fenrirealm.com": { grabber: grabFenrir },
        "helioscans.com": { grabber: grabStandard("#pages div.novel-reader") },
        "hyacinthbloom.com": { grabber: grabHyacinth, useFirstHeadingTitle: true },
        "jjwxc.net": { grabber: grabJjwxc },
        "joara.com": { grabber: grabJoara },
        "karistudio.com": { grabber: grabKaristudio },
        "lightnovelworld.co": { grabber: grabStandard("#chapter-container", ".chapter-title") },
        "lilyonthevalley.com": { grabber: grabLilyonthevalley, useFirstHeadingTitle: true },
        "novelingua.com": { grabber: grabNovelingua, useFirstHeadingTitle: true },
        "noveltranslation.net": { grabber: grabNovelTranslationNet },
        "patreon.com": { grabber: grabPatreon },
        "peachtea.agency": { 
            grabber: grabPeachTeaAgency, 
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.peachTeaClickAllOnOnePageButton,
            postGrab: PostGrabActions.peachTeaClickNextChapterLink
        },
        "readhive.org": { grabber: grabReadhive, useFirstHeadingTitle: true },
        "reaperscans.com": { grabber: grabStandard("#reader-container", null) },
        "requiemtls.com": { grabber: grabRequiemtls },
        "ridibooks.com": { grabber: grabRidi },
        "page.kakao.com": { grabber: grabKakaoPage, useFirstHeadingTitle: true },
        "publang.com": { grabber: grabPublang, useFirstHeadingTitle: true },
        "secondlifetranslations.com": { grabber: grabSecondLifeTranslations },
        "starlightstream.net": { grabber: grabStarlightStream },
        "storyseedling.com": { grabber: grabStorySeedling, useFirstHeadingTitle: true },
        "syosetu.com": { grabber: grabSyosetu },
        "tapas.io": { grabber: grabTapas, useFirstHeadingTitle: true },
        "webnovel.com": { grabber: grabWebnovel },
        "watashiwasugoidesu.com": { grabber: grabWatashiWaSugoiDesu },
        "yoru.world": { grabber: grabYoruWorld, useFirstHeadingTitle: true },
        "zenithtls.com": { grabber: grabZenithtls, useFirstHeadingTitle: true },
    },
    multiDomains: {
        fictioneerSites: {
            domains: ["blossomtranslation.com", "bythebai.com", "emberlib731.xyz",
                "floraegarden.com",
                "igniforge.com",
                "novelib.com", "springofromance.com", "razentl.com"],
            grabber: grabFictioneer,
            useFirstHeadingTitle: true
            // Example: You can add preGrab and postGrab functions here too
            // preGrab: PreGrabActions.scrollToBottom,
            // postGrab: PostGrabActions.clickElementWithText("Next Chapter")
        },
        madaraWpSites: {
            domains: ["foxaholic.com", "sleepytranslations.com", "system707.com"],
            grabber: madaraWpTheme
        },
        wordpressSites: {
            domains: ["eatapplepies.com", "ladyhotcombtranslations.com", "littlepinkstarfish.com",
                "maplesantl.com", "mendacity.me", "transweaver.com", "wordpress.com"],
            grabber: grabStandard(".entry-content")
        }
    }
};

function findMatchingConfig(url) {
    // Check single domain configs first
    for (const [domain, config] of Object.entries(WEBSITE_CONFIGS.singleDomains)) {
        if (url.includes(domain))  {
            console.log(`Domain: ${domain}`);
            console.log(`Grabber function: ${config.grabber.name}`);
            return config;
        }
    }

    // Then check multi-domain configs
    for (const [key, config] of Object.entries(WEBSITE_CONFIGS.multiDomains)) {
        if (config.domains.some(domain => url.includes(domain))) {
            console.log(`Multi-domain: ${key}`);
            console.log(`Grabber function: ${config.grabber.name}`);
            return config;
        }
    }

    console.log("Using default grabber (no specific configuration found)");
    return null;
}

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
                        await config.preGrab();
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
                    config.postGrab();
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

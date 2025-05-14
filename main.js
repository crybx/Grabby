// this file is loaded by grabby.html

function main() {
    // Website configurations
    const WEBSITE_CONFIGS = {
        // Grabbers for single domains
        singleDomains: {
            "archiveofourown.org": { grabber: grabAO3, useFirstHeadingTitle: true },
            "blogspot.com": { grabber: grabBlogspot },
            "chrysanthemumgarden.com": { grabber: grabChrysanthemum },
            "darkstartranslations.com": { grabber: grabDarkstar },
            "docs.google.com": { grabber: grabGoogleDocMobileBasic },
            "fanfiction.ws": { grabber: grabFanfictionNet },
            "fenrirealm.com": { grabber: grabFenrir },
            "helioscans.com": { grabber: grabHelioscans },
            "hyacinthbloom.com": { grabber: grabHyacinth, useFirstHeadingTitle: true },
            "jjwxc.net": { grabber: grabJjwxc },
            "joara.com": { grabber: grabJoara },
            "karistudio.com": { grabber: grabKaristudio },
            "lightnovelworld.co": { grabber: grabLightnovelworld },
            "novelingua.com": { grabber: grabNovelingua, useFirstHeadingTitle: true },
            "noveltranslation.net": { grabber: grabNovelTranslationNet },
            "patreon.com": { grabber: grabPatreon },
            "peachtea.agency": { grabber: grabPeachTeaAgency, useFirstHeadingTitle: true },
            "readhive.org": { grabber: grabReadhive, useFirstHeadingTitle: true },
            "reaperscans.com": { grabber: grabReaperScans },
            "requiemtls.com": { grabber: grabRequiemtls },
            "ridibooks.com": { grabber: grabRidi },
            "page.kakao.com": { grabber: grabKakaoPage },
            "publang.com": { grabber: grabPublang, useFirstHeadingTitle: true },
            "secondlifetranslations.com": { grabber: grabSecondLifeTranslations },
            "starlightstream.net": { grabber: grabStarlightStream },
            "storyseedling.com": { grabber: grabStorySeedling, useFirstHeadingTitle: true },
            "syosetu.com": { grabber: grabSyosetu },
            "tapas.io": { grabber: grabTapas, useFirstHeadingTitle: true },
            "watashiwasugoidesu.com": { grabber: grabWatashiWaSugoiDesu },
            "yoru.world": { grabber: grabYoruWorld, useFirstHeadingTitle: true },
            "zenithtls.com": { grabber: grabZenithtls, useFirstHeadingTitle: true },
        },
        multiDomains: {
            fictioneerSites: {
                domains: ["blossomtranslation.com", "bythebai.com", "emberlib731.xyz", "igniforge.com", "lilyonthevalley.com",
                    "novelib.com", "springofromance.com", "razentl.com"],
                grabber: grabFictioneer,
                useFirstHeadingTitle: true
            },
            madaraWpSites: {
                domains: ["foxaholic.com", "sleepytranslations.com", "system707.com"],
                grabber: madaraWpTheme
            },
            wordpressSites: {
                domains: ["eatapplepies.com", "ladyhotcombtranslations.com",
                    "littlepinkstarfish.com", "mendacity.me", "transweaver.com", "wordpress.com"],
                grabber: grabWordpress
            }
        }
    };

    function findMatchingConfig(url) {
        // Check single domain configs first
        for (const [domain, config] of Object.entries(WEBSITE_CONFIGS.singleDomains)) {
            if (url.includes(domain)) return config;
        }

        // Then check multi-domain configs
        for (const [key, config] of Object.entries(WEBSITE_CONFIGS.multiDomains)) {
            if (config.domains.some(domain => url.includes(domain))) return config;
        }

        return null;
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
        const title = url.split("/").pop().split(".").slice(0, -1).join(".");
        const content = grabLocalFile();
        return { title, content };
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
                    try {
                        content = config.grabber();
                    } catch (grabError) {
                        console.error(`Error in grabber for ${url}:`, grabError);
                        content = grabUnknown(); // Fallback to generic grabber
                    }
                    filename = extractTitle(content, config.useFirstHeadingTitle);
                } else {
                    content = grabUnknown();
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

            await handleContentDownload(filename, content);
        } catch (error) {
            console.error("Error grabbing content:", error);
            // Consider showing a user-friendly error notification
            chrome.runtime.sendMessage({
                target: "background",
                type: "showError",
                message: `Failed to grab content: ${error.message}`
            });
        }
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
        } catch (error) {
            console.error("Error downloading content:", error);
            URL.revokeObjectURL(blobUrl);
        } finally {
            if (blobUrl) URL.revokeObjectURL(blobUrl);
        }
    }

    return grabFromWebsite();
}

// Initialize content grabbing
chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function (activeTabs) {
        if (!activeTabs || activeTabs.length === 0) {
            console.error("No active tab found");
            return;
        }

        activeTabs.map(function (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: main
            });
        });
    });
});

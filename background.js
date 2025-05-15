// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

const OFFSCREEN_DOCUMENT_PATH = '/offscreen.html';

// Listen for the extension icon click
chrome.action.onClicked.addListener(async () => {
    sendMessageToOffscreenDocument(
        'add-exclamationmarks-to-headings',
        '<html><head></head><body><h1>Hello World</h1></body></html>'
    );
});

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'grab-content') {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Execute the main function directly without opening the popup
        chrome.scripting.executeScript({
            target: { tabId: tab.id },
            func: () => {
                // We need to get the main function from the extension
                // This function replicates what main.js does
                const grabFromPage = async () => {
                    // Get the main function from the extension context
                    // This code will be injected into the page and executed there
                    // We're replicating the functionality from main.js
                    const mainFunc = function() {
                        // Website configurations
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
                                    grabber: grabStandard(".entry-content")
                                }
                            }
                        };

                        // Duplicate the functionality of main.js
                        function findMatchingConfig(url) {
                            // Check single domain configs first
                            for (const [domain, config] of Object.entries(WEBSITE_CONFIGS.singleDomains)) {
                                if (url.includes(domain))  {
                                    console.log(`Domain: ${domain}`)
                                    console.log(`Grabber function: ${config.grabber.name}`);
                                    return config;
                                }
                            }

                            // Then check multi-domain configs
                            for (const [key, config] of Object.entries(WEBSITE_CONFIGS.multiDomains)) {
                                if (config.domains.some(domain => url.includes(domain))) {
                                    console.log(`Multi-domain: ${key}`)
                                    console.log(`Grabber function: ${config.grabber.name}`);
                                    return config;
                                }
                            }

                            console.log("Using default grabber (no specific configuration found)");
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

                        return grabFromWebsite();
                    };

                    // Execute the content grabbing function
                    const result = await mainFunc();

                    if (result && result.filename && result.content) {
                        // Copy content to clipboard
                        const copyFrom = document.createElement("textarea");
                        copyFrom.textContent = result.content;
                        document.body.appendChild(copyFrom);
                        copyFrom.select();
                        document.execCommand("copy");
                        document.body.removeChild(copyFrom);

                        // Create blob and send message to background script
                        const blobText = `<?xml version="1.0" encoding="utf-8"?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${result.filename}</title>
  <link type="text/css" rel="stylesheet" href="../styles/stylesheet.css"/>
</head>
<body>
${result.content}
</body>
</html>`;

                        const blob = new Blob([blobText], {type: "text/html"});
                        const blobUrl = URL.createObjectURL(blob);

                        chrome.runtime.sendMessage({
                            target: "background",
                            type: "downloadAsFile",
                            title: result.filename,
                            blobUrl: blobUrl,
                            cleanup: () => URL.revokeObjectURL(blobUrl)
                        });

                        // Show feedback to user
                        const notification = document.createElement('div');
                        notification.textContent = "Content grabbed!";
                        notification.style.position = 'fixed';
                        notification.style.top = '20px';
                        notification.style.right = '20px';
                        notification.style.backgroundColor = '#4CAF50';
                        notification.style.color = 'white';
                        notification.style.padding = '15px';
                        notification.style.borderRadius = '5px';
                        notification.style.zIndex = '10000';
                        document.body.appendChild(notification);

                        setTimeout(() => {
                            notification.remove();
                        }, 3000);
                    }
                };

                grabFromPage();
            }
        });
    }
});

async function sendMessageToOffscreenDocument(type, data) {
    // Create an offscreen document if one doesn't exist yet
    if (!(await hasDocument())) {
        await chrome.offscreen.createDocument({
            url: OFFSCREEN_DOCUMENT_PATH,
            reasons: [chrome.offscreen.Reason.DOM_PARSER],
            justification: 'Parse DOM'
        });
    }
    // Now that we have an offscreen document, we can dispatch the
    // message.
    chrome.runtime.sendMessage({
        type,
        target: 'offscreen',
        data
    });
}

chrome.runtime.onMessage.addListener(handleMessages);

// This function performs basic filtering and error checking on messages before
// dispatching the message to a more specific message handler.
async function handleMessages(message) {
    // Return early if this message isn't meant for the background script
    if (message.target !== 'background') {
        return;
    }

    // Dispatch the message to an appropriate handler.
    switch (message.type) {
        case 'add-exclamationmarks-result':
            handleAddExclamationMarkResult(message.data);
            closeOffscreenDocument();
            break;
        case 'downloadAsFile':
            downloadAsFile(message.title, message.blobUrl, message.cleanup);
            break;
        case 'showError':
            // You could implement a notification system here
            console.error(message.message);
            break;
        default:
            console.warn(`Unexpected message type received: '${message.type}'.`);
    }
}

async function downloadAsFile(title, blobUrl, cleanup) {
    let fileName = title;
    // # and , are not illegal, but they are annoying
    let illegalWindowsFileNameRegex = /[<>:"#!/\\|?*]/g;
    fileName = fileName.replace(illegalWindowsFileNameRegex, '');

    // remove 'Ridi' from the filename
    fileName = fileName.replace(' - Ridi', '');
    // remove any other whitespace
    fileName = fileName.replace(/\s/g, '_');
    // replace . with _ in the filename
    fileName = fileName.replace(/\./g, '_');
    // replace comma with nothing
    fileName = fileName.split(',').join('');
    fileName = fileName + '.xhtml';
    console.log(fileName);

    let options = {
        url: blobUrl,
        filename: fileName,
        saveAs: false
    };

    const downloadId = await chrome.downloads.download(options, cleanup);
    console.log(`Download started with ID ${downloadId}`);
}

async function handleAddExclamationMarkResult(dom) {
    console.log('Received dom', dom);
}

async function closeOffscreenDocument() {
    if (!(await hasDocument())) {
        return;
    }
    await chrome.offscreen.closeDocument();
}

async function hasDocument() {
    // Check all windows controlled by the service worker if one of them is the offscreen document
    const matchedClients = await clients.matchAll();
    for (const client of matchedClients) {
        if (client.url.endsWith(OFFSCREEN_DOCUMENT_PATH)) {
            return true;
        }
    }
    return false;
}
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

// Function to inject scripts sequentially and then execute a callback function
async function injectScriptsAndExecute(tabId) {
    const scripts = ['utils.js', 'grabbers.js', 'grabber-core.js'];

    // Helper function to inject scripts sequentially
    async function injectScriptsSequentially(index) {
        if (index >= scripts.length) {
            // All scripts injected, now execute the main function
            return chrome.scripting.executeScript({
                target: { tabId: tabId },
                func: () => {
                    // Use the shared core functionality
                    return GrabbyCore.grabFromWebsite().then(result => {
                        if (result && result.filename && result.content) {
                            return GrabbyCore.handleContentDownload(result.filename, result.content);
                        }
                        return false;
                    });
                }
            });
        }

        // Inject the current script
        return chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scripts[index]]
        }).then(() => {
            // Move to the next script
            return injectScriptsSequentially(index + 1);
        });
    }

    // Start the injection sequence with the first script
    return injectScriptsSequentially(0);
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'grab-content') {
        // Get the active tab
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab) return;

        // Inject scripts and execute grabbing function
        injectScriptsAndExecute(tab.id)
            .then(() => {
                console.log("Content grabbing initiated via keyboard shortcut");
            })
            .catch(error => {
                console.error("Error during script injection or execution:", error);
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

// This function performs basic filtering and error checking on messages before
// dispatching the message to a more specific message handler.
function handleMessages(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background script
    if (message.target !== 'background') {
        return false;
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
        case 'grab-content':
            // Get the tab ID from the message or the sender
            const tabId = message.tabId || (sender.tab && sender.tab.id);

            if (!tabId) {
                console.error("No tab ID provided for content grabbing");
                sendResponse({ success: false, error: "No tab ID provided" });
                return true;
            }

            // Inject scripts and execute grabbing function
            injectScriptsAndExecute(tabId)
                .then(() => {
                    console.log("Content grabbing initiated via message");
                    sendResponse({ success: true });
                })
                .catch(error => {
                    console.error("Error during script injection or execution:", error);
                    sendResponse({ success: false, error: error.message });
                });

            // Return true to indicate we'll send a response asynchronously
            return true;
        default:
            console.warn(`Unexpected message type received: '${message.type}'.`);
    }
    return false;
}

// Register the message listener
chrome.runtime.onMessage.addListener(handleMessages);

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
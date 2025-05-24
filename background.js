// Function to inject scripts sequentially and then execute a callback function
async function injectGrabbingScriptsAndExecute(tabId) {
    const scripts = ['utils.js', 'grabbers.js', 'grabber-core.js'];

    // First, check if GrabbyCore is already available (if so, we can skip injecting scripts)
    const coreCheckResult = await chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
            return typeof GrabbyCore !== 'undefined';
        }
    });

    const grabbyExists = coreCheckResult[0].result;

    // If GrabbyCore already exists, just run the grabbing function
    if (grabbyExists) {
        console.log("GrabbyCore already exists, skipping script injection");
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

        // Check if this script needs to be injected
        const scriptName = scripts[index].replace('.js', '');
        const variablesToCheck = {
            'utils': ['removeTag', 'unwrapTag'], // Functions from utils.js
            'grabbers': ['grabRidi', 'grabPatreon'], // Functions from grabbers.js
            'grabber-core': ['GrabbyCore'] // Object from grabber-core.js
        };

        const checkResult = await chrome.scripting.executeScript({
            target: { tabId: tabId },
            func: (vars) => {
                // For each variable to check, see if it exists in the global scope
                return vars.some(v => typeof window[v] !== 'undefined' ||
                    (typeof window.GrabbyCore !== 'undefined' &&
                        typeof window.GrabbyCore[v] !== 'undefined'));
            },
            args: [variablesToCheck[scriptName] || []]
        });

        const scriptExists = checkResult[0].result;

        if (scriptExists) {
            console.log(`Script ${scripts[index]} appears to be already loaded, skipping`);
            // Skip to the next script
            return injectScriptsSequentially(index + 1);
        }

        // Inject the current script
        console.log(`Injecting ${scripts[index]}`);
        return chrome.scripting.executeScript({
            target: { tabId: tabId },
            files: [scripts[index]]
        }).then(() => {
            // Move to the next script
            return injectScriptsSequentially(index + 1);
        }).catch(error => {
            console.error(`Failed to inject ${scripts[index]}:`, error);
            throw error;
        });
    }

    // Start the injection sequence with the first script
    return injectScriptsSequentially(0);
}

// Listen for keyboard commands
chrome.commands.onCommand.addListener(async (command) => {
    if (command === "grab_content") {
        await grabContent();
    }
});

async function getTabId(message, sender) {
    let tabId = message?.tabId;

    if (!tabId && sender?.tab) {
        tabId = sender.tab.id;
    }

    if (!tabId) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab) {
            tabId = tab.id;
        }
    }

    if (!tabId) {
        console.error("No tab ID found for content grabbing");
        return null;
    }

    return tabId;
}

async function grabContent(message, sender) {
    let tabId = await getTabId(message, sender);
    if (tabId) {
        try {
            // Get tab info to check if it's a file URL
            const tab = await chrome.tabs.get(tabId);
            console.log("Grabbing content from:", tab.url);
            
            // Inject scripts and execute grabbing function
            await injectGrabbingScriptsAndExecute(tabId);
            console.log("Content grabbing initiated successfully");
        } catch (error) {
            console.error("Error during script injection or execution:", error);
            // If it's a file URL and scripting fails, we might need a different approach
            if (error.message && error.message.includes("Cannot access")) {
                console.error("Cannot access file:// URL. Make sure 'Allow access to file URLs' is enabled for this extension.");
            }
        }
    }
}

// Basic filtering and error checking on messages before dispatching
// the message to a more specific functions or message handlers.
async function handleMessages(message, sender, sendResponse) {
    // Return early if this message isn't meant for the background script
    if (message.target !== 'background') {
        return false;
    }

    switch (message.type) {
        case 'downloadAsFile':
            await downloadAsFile(message.title, message.blobUrl, message.cleanup);
            break;
        case 'showError':
            // You could implement a notification system here
            console.error(message.message);
            break;
        case 'grabContent':
            await grabContent(message, sender);
            break;
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
    fileName = fileName + '.html';
    console.log(fileName);

    let options = {
        url: blobUrl,
        filename: fileName,
        saveAs: false
    };

    const downloadId = await chrome.downloads.download(options, cleanup);
    console.log(`Download started with ID ${downloadId}`);
}

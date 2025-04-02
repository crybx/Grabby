function main() {
    // Website configurations
    const WEBSITE_CONFIGS = {
        // Grabbers for single domains
        singleDomains: {
            'archiveofourown.org': { grabber: grabAO3, useFirstHeadingTitle: true },
            'blogspot.com': { grabber: grabBlogspot },
            'chrysanthemumgarden.com': { grabber: grabChrysanthemum },
            'docs.google.com': { grabber: grabGoogleDocMobileBasic },
            'fanfiction.ws': { grabber: grabFanfictionNet },
            'fenrirealm.com': { grabber: grabFenrir },
            'jjwxc.net': { grabber: grabJjwxc },
            'joara.com': { grabber: grabJoara },
            'karistudio.com': { grabber: grabKaristudio },
            'novelingua.com': { grabber: grabNovelingua, useFirstHeadingTitle: true },
            'noveltranslation.net': { grabber: grabNovelTranslationNet },
            'patreon.com': { grabber: grabPatreon },
            'peachtea.agency': { grabber: grabPeachTeaAgency, useFirstHeadingTitle: true },
            'readhive.org': { grabber: grabReadhive, useFirstHeadingTitle: true },
            'reaperscans.com': { grabber: grabReaperScans },
            'ridibooks.com': { grabber: grabRidi },
            'page.kakao.com': { grabber: grabKakaoPage },
            'publang.com': { grabber: grabPublang, useFirstHeadingTitle: true },
            'secondlifetranslations.com': { grabber: grabSecondLifeTranslations },
            'starlightstream.net': { grabber: grabStarlightStream },
            'storyseedling.com': { grabber: grabStorySeedling },
            'syosetu.com': { grabber: grabSyosetu },
            'watashiwasugoidesu.com': { grabber: grabWatashiWaSugoiDesu },
            'yoru.world': { grabber: grabYoruWorld, useFirstHeadingTitle: true },
            'zenithtls.com': { grabber: grabZenithtls, useFirstHeadingTitle: true },
        },
        multiDomains: {
            fictioneerSites: {
                domains: ['blossomtranslation.com', 'emberlib731.xyz', 'igniforge.com', 'lilyonthevalley.com',
                    'novelib.com', 'springofromance.com', 'razentl.com'],
                grabber: grabFictioneer
            },
            madaraWpSites: {
                domains: ['darkstartranslations.com', 'foxaholic.com', 'sleepytranslations.com', 'system707.com'],
                grabber: madaraWpTheme
            },
            wordpressSites: {
                domains: ['eatapplepies.com', 'ladyhotcombtranslations.com', 'littlepinkstarfish.com', 'mendacity.me',
                    'transweaver.com', 'wordpress.com'],
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
        return document.querySelector('title')?.textContent ||
            document.querySelector('h1')?.textContent ||
            'chapter';
    }

    function handleLocalFile(url) {
        const title = url.split('/').pop().split('.').slice(0, -1).join('.');
        const content = grabLocalFile();
        return { title, content };
    }

    async function grabFromWebsite() {
        const url = window.location.href;
        let title, content;

        try {
            if (url.includes('file://')) {
                ({ title, content } = handleLocalFile(url));
            } else {
                const config = findMatchingConfig(url);

                if (config) {
                    content = config.grabber();
                    title = extractTitle(content, config.useFirstHeadingTitle);
                } else {
                    content = grabUnknown();
                    title = extractTitle(content, false);
                    console.log('This website is not specifically supported: ', url);
                }
            }

            if (!content || content.trim() === '') {
                throw new Error('No content could be extracted from this page');
            }

            await handleContentDownload(title, content);
        } catch (error) {
            console.error('Error grabbing content:', error);
            // Consider showing a user-friendly error notification
            chrome.runtime.sendMessage({
                target: 'background',
                type: 'showError',
                message: `Failed to grab content: ${error.message}`
            });
        }
    }

    async function handleContentDownload(title, content) {
        try {
            copyToClipboard(content);

            const blob = getFileBlobFromContent(title, content);
            const blobUrl = URL.createObjectURL(blob);

            await chrome.runtime.sendMessage({
                target: 'background',
                type: 'downloadAsFile',
                title: title,
                blobUrl: blobUrl,
                cleanup: () => URL.revokeObjectURL(blobUrl)
            });
        } catch (error) {
            console.error('Error downloading content:', error);
            URL.revokeObjectURL(blobUrl);
        }
    }

    return grabFromWebsite();
}

// Initialize content grabbing
chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function (activeTabs) {
        if (!activeTabs || activeTabs.length === 0) {
            console.error('No active tab found');
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

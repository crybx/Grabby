function grabFromWebsite() {
    // Get the url of the current tab
    const url = window.location.href;
    // get tab title
    let title =
        document.querySelector('title')?.textContent ||
        document.querySelector('h1')?.textContent ||
        'chapter';
    let content = '';

    if (url) {
        if (url.includes('ridibooks.com')) {
            content = grabRidi();
        } else if (url.includes('publang.com/')) {
            content = grabPublang();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('syosetu.com')) {
            content = grabSyosetu();
        } else if (url.includes('chrysanthemumgarden.com')) {
            content = grabChrysanthemum();
        } else if (url.includes('docs.google.com')) {
            content = grabGoogleDocMobileBasic();
        } else if (url.includes('blogspot.com')) {
            content = grabBlogspot();
        } else if (url.includes('galaxytranslations')
                || url.includes('foxaholic.com')
                || url.includes('wooksteahouse.com')
                || url.includes('darkstartranslations.com')
                || url.includes('sleepytranslations.com')) {
            content = madaraWpTheme();
        } else if (url.includes('watashiwasugoidesu.com')) {
            content = grabWatashiWaSugoiDesu();
        } else if (url.includes('wordpress.com')
                || url.includes('mendacity.me')
                || url.includes('transweaver.com')
                || url.includes('ladyhotcombtranslations.com')
                || url.includes('eatapplepies.com')
                || url.includes('littlepinkstarfish.com')) {
            content = grabWordpress();
        } else if (url.includes('jjwxc.net')) {
            content = grabJjwxc();
        } else if (url.includes('storyseedling.com')) {
            content = grabStorySeedling();
        } else if (url.includes('blossomtranslation.com')
                || url.includes('springofromance.com')
                || url.includes('razentl.com')
                || url.includes('igniforge.com')
                || url.includes('novelib.com')
                || url.includes('lilyonthevalley.com')) {
            content = grabBlossom();
        } else if (url.includes('page.kakao.com')) {
            content = grabKakaoPage();
        } else if (url.includes('joara.com')) {
            content = grabJoara();
        } else if (url.includes('patreon.com')) {
            content = grabPatreon();
        } else if (url.includes('yoru.world')) {
            content = grabYoruWorld();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('starlightstream.net')) {
            content = grabStarlightStream();
        } else if (url.includes('novelingua.com')) {
            content = grabNovelingua();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('zenithtls.com')) {
            content = grabZenithtls();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('readhive.org')) {
            content = grabReadhive();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('peachtea.agency')) {
            content = grabPeachTeaAgency();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('archiveofourown.org')) {
            content = grabAO3();
            title = getTitleFromFirstHeading(content);
        } else if (url.includes('fanfiction.ws')) {
            content = grabFanfictionNet();
        } else if (url.includes('fenrirealm.com')) {
            content = grabFenrir();
        } else if (url.includes('file://')) {
            // get the filename from the end of the url and remove the extension
            title = url.split('/').pop();
            title = title.split('.').slice(0, -1).join('.');
            content = grabLocalFile();
        }
        else {
            content = grabUnknown();
            console.log('This website is not specifically supported');
            console.log('URL:', url);
        }
    }

    copyToClipboard(content);

    // Download logic
    let blob = getFileBlobFromContent(title, content);
    let blobUrl = URL.createObjectURL(blob);
    let cleanup = () => { URL.revokeObjectURL(options.url); };
    chrome.runtime.sendMessage({
        target: 'background',
        type: 'downloadAsFile',
        title: title,
        blobUrl: blobUrl,
        cleanup: cleanup
    });
}

chrome.windows.getCurrent(function (currentWindow) {
    chrome.tabs.query({ active: true, windowId: currentWindow.id }, function (activeTabs) {
        activeTabs.map(function (tab) {
            chrome.scripting.executeScript({
                target: { tabId: tab.id },
                func: grabFromWebsite
            });
        });
    });
});

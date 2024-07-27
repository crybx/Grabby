function grabFromWebsite() {
    // Get the url of the current tab
    const url = window.location.href;

    if (url) {
        if (url.includes('ridibooks.com')) {
            grabRidi();
        } else if (url.includes('publang.com/')) {
            grabPublang();
        } else if (url.includes('syosetu.com')) {
            grabSyosetu();
        } else if (url.includes('chrysanthemumgarden.com')) {
            grabChrysanthemum();
        } else if (url.includes('docs.google.com')) {
            grabGoogleDocMobileBasic();
        } else if (url.includes('blogspot.com')) {
            grabBlogspot();
        } else if (url.includes('galaxytranslations97.com')
                || url.includes('foxaholic.com')
                || url.includes('wooksteahouse.com')) {
            madaraWpTheme();
        } else if (url.includes('watashiwasugoidesu.com')) {
            grabWatashiWaSugoiDesu();
        } else if (url.includes('wordpress.com')
                || url.includes('mendacity.me')){
            grabWordpress();
        } else if (url.includes('jjwxc.net')) {
            grabJjwxc();
        } else if (url.includes('storyseedling.com')) {
            grabStorySeedling();
        } else if (url.includes('blossomtranslation.com')) {
            grabBlossom();
        } else if (url.includes('page.kakao.com')) {
            grabKakaoPage();
        } else if (url.includes('file://')) {
            grabLocalFile();
        }
        else {
            console.log('This website is not supported');
            console.log('URL:', url);
        }
    }
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



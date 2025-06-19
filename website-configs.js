// Website configurations for Grabby
// Each site config can have:
// - grabber: function to extract content (required)
// - useFirstHeadingTitle: boolean to use first <h1> as title (optional)
// - preGrab: function to run before grabbing content (optional)
// - postGrab: function to run after grabbing content (optional)
// - runActionsOnDirectGrab: boolean to run pre/post actions on direct grabs (optional, defaults to true)
// - autoGrab: configuration for automatic new chapter grabbing (optional)
//   - enabled: boolean to enable auto-grab for this site
//   - defaultCount: default number of chapters to grab
//   - defaultDelay: default delay between grabs in seconds
//   - activeTab: boolean to open tabs as active/focused (defaults to false)
//
// Example usage:
// "example.com": { 
//     grabber: grabExample,
//     useFirstHeadingTitle: true,
//     runActionsOnDirectGrab: false,  // Disable pre/post actions for direct grabs (shortcut/button)
//     preGrab: PreGrabActions.scrollToBottom,  // Pre-grab actions
//     postGrab: PostGrabActions.clickLinkContaining("Next", { exact: true }),  // Post-grab actions
//     autoGrab: { enabled: true, defaultCount: 10, defaultDelay: 5, activeTab: true }  // Auto-grab config
// }
const WEBSITE_CONFIGS = {
    // Grabbers for single domains
    singleDomains: {
        "archiveofourown.org": { grabber: grabAO3, useFirstHeadingTitle: true },
        "blogspot.com": { grabber: grabBlogspot },
        "chrysanthemumgarden.com": { grabber: grabChrysanthemum },
        "darkstartranslations.com": { grabber: grabStandard(".chapter-content") },
        "docs.google.com": { grabber: grabGoogleDocMobileBasic },
        "emptymurmurs.wordpress.com": {
            grabber: grabStandard(".entry-content"),
            preGrab: PreGrabActions.checkForDuplicateChapter,
            postGrab: () => PostGrabActions.clickLinkContaining("NEXT", { abortIfNotFound: true }),
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        },
        "fanfiction.ws": { grabber: grabStandard(".storytext") },
        "fenrirealm.com": { grabber: grabFenrir },
        "helioscans.com": { grabber: grabStandard("#pages div.novel-reader") },
        "hyacinthbloom.com": {
            grabber: grabHyacinth,
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.checkForPremiumContent,
            postGrab: PostGrabActions.pressRightArrow,
            autoGrab: { enabled: true, defaultCount: 10, defaultDelay: 10 }
        },
        "jjwxc.net": { grabber: grabJjwxc },
        "joara.com": { grabber: grabJoara },
        "karistudio.com": { grabber: grabKaristudio },
        "lightnovelworld.co": { grabber: grabStandard("#chapter-container", ".chapter-title") },
        "lilyonthevalley.com": {
            grabber: grabLilyonthevalley,
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.checkForPremiumContent,
            postGrab: PostGrabActions.pressRightArrow,
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 10 }
        },
        "maplesantl.com": {
            grabber: grabStandard(".entry-content"),
            preGrab: PreGrabActions.checkForDuplicateChapter,
            postGrab: () =>
                PostGrabActions.clickLinkContaining(
                    ["Episode", "Next"],
                    { selector: ".wp-block-button:nth-child(2) a.wp-block-button__link" }
                ),
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        },
        "novelingua.com": { grabber: grabNovelingua, useFirstHeadingTitle: true },
        "noveltranslation.net": { grabber: grabNovelTranslationNet },
        "patreon.com": { grabber: grabPatreon },
        "peachtea.agency": { 
            grabber: grabPeachTeaAgency, 
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.peachTeaClickAllOnOnePageButton,
            postGrab: PostGrabActions.peachTeaClickNextChapterLink,
            autoGrab: { enabled: true, defaultCount: 5, defaultDelay: 60 }
        },
        "readhive.org": {
            grabber: grabReadhive,
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.checkForPremiumContent,
            postGrab: () => PostGrabActions.clickLinkContaining("Next"),
            autoGrab: { enabled: true, defaultCount: 20, defaultDelay: 15, activeTab: true }
        },
        "reaperscans.com": { grabber: grabStandard("#reader-container", null) },
        "requiemtls.com": { grabber: grabRequiemtls },
        "ridibooks.com": {
            grabber: grabRidi,
            runActionsOnDirectGrab: false,
            preGrab: PreGrabActions.ridiTranslate,
            postGrab: PostGrabActions.ridiNext,
            autoGrab: { enabled: true, defaultCount: 2, defaultDelay: 15, activeTab: true }
        },
        "page.kakao.com": { grabber: grabKakaoPage, useFirstHeadingTitle: true },
        "publang.com": { grabber: grabPublang, useFirstHeadingTitle: true },
        "secondlifetranslations.com": { grabber: grabSecondLifeTranslations },
        "starlightstream.net": {
            grabber: grabStarlightStream,
            preGrab: PreGrabActions.checkForPageNotFound,
            postGrab: () => PostGrabActions.clickLinkContaining("Next", { exact: true }),
            autoGrab: { enabled: true, defaultCount: 5, defaultDelay: 20 }
        },
        "storyseedling.com": {
            grabber: grabStorySeedling,
            useFirstHeadingTitle: true,
            preGrab: PreGrabActions.checkForPremiumContent,
            postGrab: () => PostGrabActions.clickLinkContaining("Next", { exact: true }),
            autoGrab: { enabled: true, defaultCount: 20, defaultDelay: 15, activeTab: true }
        },
        "syosetu.com": { grabber: grabSyosetu },
        "tapas.io": { grabber: grabTapas, useFirstHeadingTitle: true },
        "transweaver.com": {
            grabber: grabStandard(".entry-content"),
            preGrab: PreGrabActions.checkForPremiumContent,
            postGrab: PostGrabActions.pressRightArrow,
            autoGrab: { enabled: true, defaultCount: 18, defaultDelay: 10 }
        },
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
            useFirstHeadingTitle: true,
            preGrab: () => PreGrabActions.checkForPremiumContent(["h1, h2, h3, .mycred-sell-this-wrapper"]),
            postGrab: PostGrabActions.pressRightArrow,
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 10 }
        },
        madaraWpSites: {
            domains: ["foxaholic.com", "sleepytranslations.com", "system707.com"],
            grabber: madaraWpTheme,
            postGrab: PostGrabActions.pressRightArrow,
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 10 }
        },
        wordpressSites: {
            domains: ["eatapplepies.com", "ladyhotcombtranslations.com", "littlepinkstarfish.com",
                "mendacity.me", "wordpress.com"],
            grabber: grabStandard(".entry-content"),
            preGrab: PreGrabActions.checkForDuplicateChapter,
            postGrab: () => PostGrabActions.clickLinkContaining("NEXT", { abortIfNotFound: true }),
            autoGrab: { enabled: true, defaultCount: 15, defaultDelay: 5 }
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

// Export for use in other files
if (typeof window !== "undefined") {
    window.WEBSITE_CONFIGS = WEBSITE_CONFIGS;
    window.findMatchingConfig = findMatchingConfig;
}
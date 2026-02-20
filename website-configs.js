// Website configurations for Grabby
// Each site config can have:
// - grabber: function to extract content (required)
// - useFirstHeadingTitle: boolean to use first <h1> as title (optional)
// - preGrab: function to run before grabbing content (optional)
// - postGrab: function to run after grabbing content (optional)
// - runActionsOnDirectGrab: boolean to run pre/post actions on direct grabs (optional, defaults to true)
// - autoNav: configuration for automatic navigation during chapter grabbing (optional)
//   - enabled: boolean to enable auto-nav for this site
//   - defaultCount: default number of chapters to grab
//   - defaultDelay: default delay between grabs in seconds
//   - activeTab: boolean to open tabs as active/focused (defaults to false)
//
// Example usage:
// "example.com": { 
//     grabber: grabExample,
//     useFirstHeadingTitle: true,
//     runActionsOnDirectGrab: false,  // Disable pre/post actions for direct grabs (shortcut/button)
//     preGrab: GrabActions.scrollToBottom,  // Pre-grab actions
//     postGrab: GrabActions.clickElementWithText("Next", { exact: true }),  // Post-grab actions
//     autoNav: { enabled: true, defaultCount: 10, defaultDelay: 5, activeTab: true }  // Auto-nav config
// }
const WEBSITE_CONFIGS = {
    // Grabbers for single domains
    singleDomains: {
        "archiveofourown.org": { grabber: "grabAO3", useFirstHeadingTitle: true },
        "blogspot.com": { grabber: "grabBlogspot" },
        "chrysanthemumgarden.com": {
            grabber: "grabChrysanthemum",
            postGrab: {
                fn: "GrabActions.clickElementWithText",
                args: ["Next", {
                    exact: true,
                    selector: ".nav-next",
                    abortIfNotFound: true
                }]
            },
            autoNav: { enabled: true, defaultCount: 10, defaultDelay: 10 }
        },
        "brightnovels.com": {
            grabber: { fn: "grabStandard", args: [".chapter-content"] },
            preGrab: { fn: "GrabActions.checkForLockedContent", args: [["h4"]] },
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["Next", { exact: true }] },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        },
        "docs.google.com": { grabber: "grabGoogleDocMobileBasic" },
        "emptymurmurs.com": {
            grabber: { fn: "grabStandard", args: [".entry-content"] },
            postGrab: { fn: "GrabActions.clickElementWithText", args: [["NEXT", "Next"], { abortIfNotFound: true }] },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        },
        "fanfiction.com": { grabber: { fn: "grabStandard", args: [".storytext"] } },
        "fenrirealm.com": { 
            grabber: "grabFenrir",
            preGrab: { fn: "GrabActions.checkForUrlText", args: [["auth/login"]] },
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 30, defaultDelay: 10 }
        },
        "helioscans.com": {
            grabber: { fn: "grabStandard", args: ["#pages div.novel-reader"] },
            preGrab: {
                fn: "GrabActions.checkForLockedContent",
                args: [["div", "span", "p"], ["This is an early access chapter."]]
            },
            postGrab: {
                fn: "GrabActions.clickElementBySelector",
                args: ["#chapter_controls_header a[href*=\"/chapter/\"]:has(img[src*=\"arrow-right.svg\"])"]
            },
            autoNav: { enabled: true, defaultCount: 20, defaultDelay: 10 }
        },
        "hyacinthbloom.com": {
            grabber: "grabHyacinth",
            useFirstHeadingTitle: true,
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 10, defaultDelay: 10 }
        },
        "jjwxc.net": { grabber: "grabJjwxc" },
        "joara.com": { grabber: "grabJoara" },
        "karistudio.com": { grabber: "grabKaristudio" },
        "lightnovelworld.co": { grabber: { fn: "grabStandard", args: ["#chapter-container", ".chapter-title"] } },
        "maplesantl.com": {
            grabber: { fn: "grabStandard", args: [".entry-content"] },
            postGrab: {
                fn: "GrabActions.clickElementWithText",
                args: [
                    ["Episode", "Next", "Chapter"],
                    { selector: ".wp-block-button:nth-child(2) a.wp-block-button__link" }
                ]
            },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        },
        "medium.com": { grabber: { fn: "grabStandard", args: ["section", null] } },
        "mistminthaven.com": {
            grabber: { fn: "grabStandard", args: ["#chapter-content-text", ".reader-header h1"] },
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: {
                fn: "GrabActions.clickElementBySelector",
                args: ["div[title='Next chapter']"]
            },
            autoNav: { enabled: true, defaultCount: 20, defaultDelay: 10 },
            useStoryTitleInFilename: true
        },
        "novelingua.com": {
            grabber: "grabNovelingua",
            useFirstHeadingTitle: true,
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["Next Chapter"] },
        },
        "novelpia.com": {
            grabber: { fn: "grabStandard", args: ["#book-box", ["title", ".in-ch-txt"]] },
            useFirstHeadingTitle: true,
            postGrab: { fn: "GrabActions.clickElementBySelector", args: [".next-epi-btn"] },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 10 },
            filenameCleanupPatterns: ["Novelpia - "]
        },
        "noveltranslation.net": { grabber: "grabNovelTranslationNet" },
        "patreon.com": { grabber: "grabPatreon" },
        "peachtea.agency": { 
            grabber: "grabPeachTeaAgency", 
            useFirstHeadingTitle: true,
            postGrab: "GrabActions.peachTeaClickNextChapterLink",
            autoNav: { enabled: true, defaultCount: 5, defaultDelay: 60, activeTab: true }
        },
        "readhive.org": {
            grabber: "grabReadhive",
            useFirstHeadingTitle: true,
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["Next"] },
            autoNav: { enabled: true, defaultCount: 20, defaultDelay: 15, activeTab: true }
        },
        "reaperscans.com": { grabber: { fn: "grabStandard", args: ["#reader-container", null] } },
        "requiemtls.com": { grabber: "grabRequiemtls" },
        "ridibooks.com": {
            grabber: "grabRidi",
            runActionsOnDirectGrab: false,
            preGrab: "GrabActions.googleTranslate",
            postGrab: "GrabActions.ridiNext",
            autoNav: { enabled: true, defaultCount: 10, defaultDelay: 15, activeTab: true },
            filenameCleanupPatterns: [" - Ridibooks"]
        },
        "page.kakao.com": { grabber: "grabKakaoPage", useFirstHeadingTitle: true },
        "publang.com": { 
            grabber: "grabPublang", 
            useFirstHeadingTitle: true,
            postGrab: {
                fn: "GrabActions.clickElementBySelector",
                args: ["button.page-link.cursor-pointer", { index: 1 }]
            },
            autoNav: { enabled: true, defaultCount: 10, defaultDelay: 5 }
        },
        "secondlifetranslations.com": { grabber: "grabSecondLifeTranslations" },
        "starlightstream.net": {
            grabber: "grabStarlightStream",
            preGrab: { fn: "GrabActions.checkForPageErrors", args: [[".blog-post-title-font"]] },
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["Next", { exact: true }] },
            autoNav: { enabled: true, defaultCount: 5, defaultDelay: 20 }
        },
        "storyseedling.com": {
            grabber: "grabStorySeedling",
            useFirstHeadingTitle: true,
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["Next", { exact: true }] },
            autoNav: { enabled: true, defaultCount: 20, defaultDelay: 15, activeTab: true }
        },
        "syosetu.com": { 
            grabber: "grabSyosetu",
            preGrab: "GrabActions.googleTranslate",
            postGrab: { fn: "GrabActions.clickElementBySelector", args: [".c-pager__item--next"] },
            autoNav: { enabled: true, defaultCount: 20, defaultDelay: 15, activeTab: true }
        },
        "tapas.io": { grabber: "grabTapas", useFirstHeadingTitle: true },
        "webnovel.com": { grabber: "grabWebnovel" },
        "watashiwasugoidesu.com": { grabber: "grabWatashiWaSugoiDesu" },
        "yoru.world": { grabber: "grabYoruWorld", useFirstHeadingTitle: true },
        "zenithtls.com": {
            grabber: "grabZenithtls",
            useFirstHeadingTitle: true,
            postGrab: {
                fn: "GrabActions.clickElementBySelector",
                args: ["main div div a", { index: 1 }]
            },
        },
    },
    multiDomains: {
        fictioneerSites: {
            domains: ["blossomtranslation.com", "bythebai.com", "emberlib731.xyz",
                "floraegarden.com",
                "novelib.com", "springofromance.com", "smeraldogarden.com"],
            grabber: "grabFictioneer",
            useFirstHeadingTitle: true,
            preGrab: {
                fn: "GrabActions.checkForLockedContent",
                args: [["h1, h2, h3, .mycred-sell-this-wrapper, .cmppp-plan-card"]] },
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 10 }
        },
        fictioneerValleySites: {
            domains: ["lilyonthevalley.com", "talesinthevalley.com", "cherrymist.cafe"],
            grabber: "grabLilyonthevalley",
            useFirstHeadingTitle: true,
            preGrab: {
                fn: "GrabActions.checkForPageErrorsAndLockedContent",
                args: [
                    null,
                    ["h1", "h2", "h3", ".mycred-sell-this-wrapper"],
                    ["Secret Pavilion", "Hidden Pavilion"]
                ]
            },
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 50, defaultDelay: 15, activeTab: true }
        },
        madaraWpSites: {
            domains: ["citrusaurora.com", "duskblossoms.com", "foxaholic.com",
                "lovelyblossoms.com", "sleepytranslations.com", "system707.com"],
            grabber: "madaraWpTheme",
            useFirstHeadingTitle: true,
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 10 },
            filenameCleanupPatterns: [" - citrus aurora"]
        },
        lightNovelWPThemeSites: {
            domains: ["blume-verse.com", "transweaver.com"],
            grabber: { fn: "grabStandard", args: [".entry-content"] },
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: "GrabActions.pressRightArrow",
            autoNav: { enabled: true, defaultCount: 18, defaultDelay: 10 }
        },
        blogusSites: {
            domains: ["nhvnovels.com", "pienovels.com"],
            grabber: { fn: "grabStandard", args: [".chapter-text"] },
            useFirstHeadingTitle: true,
            preGrab: "GrabActions.checkForLockedContent",
            postGrab: { fn: "GrabActions.clickElementBySelector", args: ["[aria-label*=\"Next\"]"] },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 10 },
            useStoryTitleInFilename: true
        },
        wordpressSites: {
            domains: ["eatapplepies.com", "ladyhotcombtranslations.com", "littlepinkstarfish.com",
                "mendacity.me", "wordpress.com"],
            grabber: { fn: "grabStandard", args: [".entry-content"] },
            postGrab: { fn: "GrabActions.clickElementWithText", args: ["NEXT", { abortIfNotFound: true }] },
            autoNav: { enabled: true, defaultCount: 15, defaultDelay: 5 }
        }
    }
};

function findMatchingConfig(url) {
    // Check single domain configs first
    for (const [domain, config] of Object.entries(WEBSITE_CONFIGS.singleDomains)) {
        if (url.includes(domain))  {
            return config;
        }
    }

    // Then check multi-domain configs
    for (const [key, config] of Object.entries(WEBSITE_CONFIGS.multiDomains)) {
        if (config.domains.some(domain => url.includes(domain))) {
            return config;
        }
    }

    return null;
}

// Function to resolve string/object function references to actual functions
function resolveFunctionReference(ref, dependencies = {}) {
    if (!ref) return undefined;
    
    // Handle string references
    if (typeof ref === "string") {
        if (ref.startsWith("GrabActions.")) {
            const methodName = ref.split(".")[1];
            return dependencies.GrabActions?.[methodName];
        }
        // Direct grabber function reference
        return dependencies.grabbers?.[ref];
    }
    
    // Handle object with function name and arguments
    if (typeof ref === "object" && ref.fn) {
        const fn = resolveFunctionReference(ref.fn, dependencies);
        if (!fn) return undefined;
        // Special handling for grabStandard which returns a function
        if (ref.fn === "grabStandard" && ref.args) {
            // Call grabStandard with args to get the actual grabber function
            return fn(...ref.args);
        }
        // Return a function that calls the resolved function with the provided arguments
        return ref.args ? () => fn(...ref.args) : fn;
    }
    
    // Handle arrays (for multiple actions)
    if (Array.isArray(ref)) {
        return ref.map(r => resolveFunctionReference(r, dependencies));
    }
    
    return ref;
}

// Function to resolve all function references in a config object
function resolveConfigFunctions(config, dependencies) {
    if (!config) return null;
    
    const resolved = { ...config };
    
    // Resolve grabber
    if (config.grabber) {
        resolved.grabber = resolveFunctionReference(config.grabber, dependencies);
    }
    
    // Resolve preGrab
    if (config.preGrab) {
        resolved.preGrab = resolveFunctionReference(config.preGrab, dependencies);
    }
    
    // Resolve postGrab
    if (config.postGrab) {
        resolved.postGrab = resolveFunctionReference(config.postGrab, dependencies);
    }
    
    return resolved;
}

// Export for use in other files
// Use globalThis for compatibility with both window contexts and service workers
if (typeof globalThis !== "undefined") {
    globalThis.WEBSITE_CONFIGS = WEBSITE_CONFIGS;
    globalThis.findMatchingConfig = findMatchingConfig;
    globalThis.resolveFunctionReference = resolveFunctionReference;
    globalThis.resolveConfigFunctions = resolveConfigFunctions;
} else if (typeof window !== "undefined") {
    window.WEBSITE_CONFIGS = WEBSITE_CONFIGS;
    window.findMatchingConfig = findMatchingConfig;
    window.resolveFunctionReference = resolveFunctionReference;
    window.resolveConfigFunctions = resolveConfigFunctions;
}
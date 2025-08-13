// content-scripts/parser-adapter.js
// Minimal WebToEpub infrastructure stubs for single chapter extraction
// Depends on util.js being loaded first

// Base parser class that WebToEpub parsers extend
class Parser {
    constructor() {
        // Base implementation
    }
    
    // Common methods that parsers may override
    //findContent(dom) exists in every parser. parsers need it to work, there is no base

    findChapterTitle(dom) {
        return null;
    }
    
    removeUnwantedElementsFromContentElement(element) {
        // Match WebToEpub's Parser.js implementation
        util.removeScriptableElements(element);
        util.removeComments(element);
        util.removeElements(element.querySelectorAll("noscript, input"));
        util.removeUnwantedWordpressElements(element);
        util.removeMicrosoftWordCrapElements(element);
        util.removeShareLinkElements(element);
        util.removeLeadingWhiteSpace(element);
    }
    
    // Extract content and return in Grabby format (based on convertRawDomToContent)
    extractGrabbyFormat(document) {
        // Clone the document so we don't modify the actual page
        const clonedDoc = document.cloneNode(true);
        
        // Extract content using the parser's findContent method
        // All WebToEpub parsers must implement findContent
        const content = this.findContent(clonedDoc);
        
        if (!content) {
            throw new Error("WebToEpub parser could not find content");
        }
        
        // Allow parser-specific content modifications
        // Create a minimal webPage object for parsers that need it
        const webPage = { 
            rawDom: clonedDoc, 
            sourceUrl: window.location.href 
        };
        this.customRawDomToContentStep(webPage, content);
        util.decodeCloudflareProtectedEmails(content);
        this.removeUnwantedElementsFromContentElement(content);
        util.fixBlockTagsNestedInInlineTags(content);
        util.removeUnusedHeadingLevels(content);
        util.setStyleToDefault(content);
        util.prepForConvertToXhtml(content);
        util.removeEmptyAttributes(content);
        util.removeSpansWithNoAttributes(content);
        util.removeEmptyDivElements(content);
        util.removeTrailingWhiteSpace(content);
        
        // Get title using parser's methods
        let title = "";
        if (typeof this.findChapterTitle === "function") {
            const titleResult = this.findChapterTitle(clonedDoc);
            if (typeof titleResult === "string") {
                // Some parsers return the title string directly
                title = titleResult.trim();
            } else if (titleResult && titleResult.textContent) {
                // Other parsers return an element
                title = titleResult.textContent.trim();
            }
        } else if (typeof this.extractTitleImpl === "function") {
            const titleResult = this.extractTitleImpl(clonedDoc);
            if (typeof titleResult === "string") {
                title = titleResult.trim();
            } else if (titleResult && titleResult.textContent) {
                title = titleResult.textContent.trim();
            }
        }
        
        if (!title) {
            title = "chapter"; // Simple fallback for title only
        }
        
        // Convert to Grabby format
        const contentHTML = content.outerHTML || content.innerHTML || "";
        
        if (!contentHTML || contentHTML.trim() === "") {
            throw new Error("No content extracted by WebToEpub parser");
        }
        
        return {
            title: title,
            content: contentHTML
        };
    }
    
    // Default implementation that parsers can override
    customRawDomToContentStep(webPage, content) { // eslint-disable-line no-unused-vars
        // Individual parsers override this for custom processing
    }
}

// Real parser factory for WebToEpub parser registration
// This needs to actually work so parsers can register themselves
const parserFactory = {
    parsers: new Map(),
    parserRules: [],
    
    register: function(domain, factoryFunc) {
        this.parsers.set(domain, factoryFunc);
    },
    
    registerRule: function(rule, factoryFunc) {
        this.parserRules.push({ test: rule, constructor: factoryFunc });
    },
    
    fetchByUrl: function(url) {
        const hostname = new URL(url).hostname;
        const constructor = this.parsers.get(hostname);
        if (constructor) {
            return constructor();
        }
        
        // Try rules
        for (const rule of this.parserRules) {
            if (rule.test(url, document)) {
                return rule.constructor();
            }
        }
        
        return null;
    }
};

// Parser class and parserFactory are available globally in content script context
// util functions are provided by WebToEpub's util.js (injected first)
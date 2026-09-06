"use strict";

// This is for the Fictioneer WordPress theme: https://github.com/Tetrakern/fictioneer

//dead urls
parserFactory.register("blossomtranslation.com", () => new FictioneerParser());
parserFactory.register("igniforge.com", () => new FictioneerParser());
parserFactory.register("lilyonthevalley.com", () => new FictioneerParser());
parserFactory.register("razentl.com", () => new FictioneerParser());
//these still exist
parserFactory.register("cherrymist.cafe", () => new CherryMistParser());
parserFactory.register("emberlib731.xyz", () => new FictioneerParser());
parserFactory.register("flyonthewalls.blog", () => new FictioneerParser());
parserFactory.register("novelib.com", () => new FictioneerParser());
parserFactory.register("smeraldogarden.com", () => new FictioneerParser());
parserFactory.register("springofromance.com", () => new FictioneerParser());
parserFactory.register("talesinthevalley.com", () => new LilyOnTheValleyParser());
parserFactory.register("twomoonslibrary.com", () => new TwoMoonsLibraryParser());

parserFactory.registerRule(
    (url, dom) => FictioneerParser.isFictioneerTheme(dom) * 0.7,
    () => new FictioneerParser()
);

class FictioneerParser extends Parser {
    constructor() {
        super();
    }

    static isFictioneerTheme(dom) {
        // the html tag has the class "fictioneer-theme"
        return (dom.querySelector("html.fictioneer-theme") !== null) ||
            (dom.querySelector(".fictioneer-theme") !== null);
    }

    async getChapterUrls(dom) {
        let chapters = [];
        // Put free chapters first
        [...dom.querySelectorAll(".chapter-group__list ._publish a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: this.chapterTitleFromLink(a),
            isIncludeable: true
        })));
        // Put scheduled chapters after free and don't select them
        [...dom.querySelectorAll("._future a")].map(a => chapters.push(({
            sourceUrl: a.href,
            title: this.chapterTitleFromLink(a),
            isIncludeable: false
        })));

        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll(".chapter-group__list-item a")]
                .map(a => ({ sourceUrl: a.href, title: this.chapterTitleFromLink(a) }));
        }

        return chapters;
    }

    // Text to use as a chapter's title, taken from its link in the chapter list.
    // Override when the link holds more than the title.
    chapterTitleFromLink(a) {
        return a.textContent;
    }

    // the element holding chapter content
    findContent(dom) {
        const content =
            dom.querySelector(".chapter-formatting") ||
            dom.querySelector("#chapter-content");

        const footnotes = dom.querySelector(".chapter__footnotes");
        if (footnotes) { content.appendChild(footnotes); }

        return content;
    }

    // title of the story (not title of each chapter)
    extractTitleImpl(dom) {
        return dom.querySelector(".story__identity-title");
    }

    extractAuthor(dom) {
        let author =
            dom.querySelector("a.author")?.textContent ||
            dom.querySelector(".story-author-meta a.author-name")?.textContent ||
            dom.querySelector(".story__identity-meta")?.textContent ||
            dom.querySelector(".story__author")?.textContent;
        // fall back to the user's default author name when the site has no byline
        if (!author?.trim()) {
            return super.extractAuthor(dom);
        }
        // remove "by " from the beginning if it exists
        return author.replace(/^by /, "").trim();
    }

    // story description
    extractDescription(dom) {
        let summary = dom.querySelector(".story__summary") ||
            dom.querySelector(".story__synopsis");
        if (summary === null) return "";
        summary = summary.cloneNode(true);
        util.removeElements(summary.querySelectorAll("figure, .story__thumbnail, .story__thumbnail-ribbon, .related-stories-block, .code-block, .jp-relatedposts"));
        return [...summary.querySelectorAll("p")]
            .map(el => el.textContent.trim())
            .filter(t => t)
            .join("\n\n");
    }

    findChapterTitle(dom) {
        // some sites use subtitles and chapter groups and info is lost without them
        let title = dom.querySelector(".chapter__title")?.textContent;
        let subtitle =
            dom.querySelector(".chapter__second-title")?.textContent ||
            dom.querySelector(".chapter__group")?.textContent;
        if (subtitle) { title += ": " + subtitle; }
        return title;
    }

    findCoverImageUrl(dom) {
        let img = this.findCoverImage(dom);

        if (!img?.src) return null;

        // Strip off the arguments for smaller sizes
        let url = img.src;
        const pos = url.indexOf("?");
        return pos !== -1 ? url.substring(0, pos) : url;
    }

    // Element holding the story's cover image.
    // Override when the site's markup doesn't match the theme defaults.
    findCoverImage(dom) {
        return dom.querySelector(".wp-post-image") ||
            dom.querySelector("figure.story__thumbnail img");
    }

    preprocessRawDom(chapterDom) {
        let antiScrape = chapterDom.querySelector(".tiv-anti-scrape")?.parentNode;
        if (!antiScrape) return;

        let payloadEl = antiScrape.querySelector("script");
        if (!payloadEl) return;

        let data = JSON.parse(payloadEl.textContent || payloadEl.innerText || "{}");
        antiScrape.replaceChildren();
        let cryptNode = chapterDom.createElement("p");
        cryptNode.className = "encryptedPayload";
        cryptNode.textContent = data.data;
        antiScrape.appendChild(cryptNode);
    }

    customRawDomToContentStep(chapter, content) {
        content.querySelectorAll("*").forEach(element => {
            if (element.tagName === "P") {
                element.removeAttribute("id");
                element.removeAttribute("data-paragraph-id");
            }
            // remove style attribute if style="font-weight: 400;" - it's just noise
            if (element.hasAttribute("style") && element.getAttribute("style") === "font-weight: 400;") {
                element.removeAttribute("style");
            }
            util.replaceSemanticInlineStylesWithTags(element, true);
        });
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeElements(element.querySelectorAll("iframe, .eoc-chapter-groups, .chapter-nav, .related-stories-block, .code-block, .jp-relatedposts"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        // Same summary fallback as extractDescription(): sites using .story__synopsis
        // have no .story__summary, so take whichever one the page has.
        let nodes = [
            ...dom.querySelectorAll(".story__header"),
            dom.querySelector(".story__summary") || dom.querySelector(".story__synopsis")
        ].filter(node => node !== null);
        return nodes.map(node => {
            const clone = node.cloneNode(true);
            // svg icons in the story header render as junk (or break) in an epub
            util.removeElements(clone.querySelectorAll("svg, .story__actions, .related-stories-block, .code-block"));
            return clone;
        });
    }

    extractSubject(dom) {
        let tags = ([...dom.querySelectorAll(".story__taxonomies .tag-pill")]);
        return tags.map(t => t.textContent?.trim()).join(", ");
    }
}

class CherryMistParser extends FictioneerParser {
    constructor() {
        super();
    }

    // Cherry Mist obfuscates chapter content: a placeholder #cherry-content-host
    // shows "Loading..." while a sibling <script id="ghost_xxxxx" data-poly data-total
    // data-{poly}-{0..N}> carries the payload. Concatenate the chunks, ROT13, base64,
    // URI-decode to recover the chapter HTML, then splice it in where the host sat.
    preprocessRawDom(chapterDom) {
        let ghost = chapterDom.querySelector("script[id^='ghost_'][data-poly][data-total]");
        let host = chapterDom.getElementById("cherry-content-host");
        if (ghost && host) {
            let poly = ghost.getAttribute("data-poly");
            let total = parseInt(ghost.getAttribute("data-total") || "0", 10);
            let payload = "";
            for (let i = 0; i < total; i++) {
                payload += ghost.getAttribute(`data-${poly}-${i}`) || "";
            }
            if (payload) {
                let rot13 = payload.replace(/[A-Za-z]/g, c => {
                    let base = c <= "Z" ? 65 : 97;
                    return String.fromCharCode((c.charCodeAt(0) - base + 13) % 26 + base);
                });
                let html = decodeURIComponent(atob(rot13));
                let tmp = chapterDom.createElement("div");
                tmp.innerHTML = html;
                let parent = host.parentNode;
                while (tmp.firstChild) {
                    parent.insertBefore(tmp.firstChild, host);
                }
                host.remove();
                ghost.remove();
            }
        }
        super.preprocessRawDom(chapterDom);
    }
}

class TwoMoonsLibraryParser extends FictioneerParser {
    constructor() {
        super();
    }

    populateUIImpl() {
        document.getElementById("removeChapterNumberRow").hidden = false;
    }

    // Chapter list links wrap the whole row, so their text runs the chapter number,
    // title, publish date and word count together ("2 CAGE CH1.2 Jun 1, '26 1.6K
    // words"). Take just the title element when the row has one, prefixed with the
    // row's chapter number unless "Remove Chapter Number" is checked (some stories
    // already have the number in the title, where the prefix would duplicate it).
    chapterTitleFromLink(a) {
        let title = a.querySelector(".chapter-group__list-item-title")?.textContent?.trim();
        if (!title) {
            return super.chapterTitleFromLink(a);
        }
        let num = a.querySelector(".chapter-group__list-item-num")?.textContent.trim();
        let removeNum = document.getElementById("removeChapterNumberCheckbox")?.checked;
        return (!removeNum && num) ? `${num} ${title}` : title;
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1.story__title")
            ?? super.extractTitleImpl(dom);
    }

    findCoverImage(dom) {
        return dom.querySelector("img.story__cover")
            ?? super.findCoverImage(dom);
    }
}

class LilyOnTheValleyParser extends FictioneerParser {
    constructor() {
        super();
    }

    customRawDomToContentStep(chapter, content) {
        util.removeTagsFromContent(content, ["BDI", "CODE", "RUBY", "SAMP", "KBD", "RT", "RP", "WBR"]);
        content.querySelectorAll("*").forEach(element => {
            // if it's a p tag and does not have attribute data-paragraph-id, remove it
            if (element.tagName === "P" && !element.hasAttribute("data-paragraph-id")) {
                element.remove();
                return;
            }
            // if it's a span, and it's got only lower case, numbers, # ; or &:
            // `<span class="[^"]*">[a-z0-9#;&]+</span>`
            if (element.tagName === "SPAN"
                && element.classList?.length === 1
                && /^[a-z0-9#;%]+$/.test(element.textContent)) {
                element.remove();
                return;
            }
            util.removeAttributes(element, ["id", "data-paragraph-id"]);
            util.replaceSemanticInlineStylesWithTags(element, true);
            util.removeElementWithAttributes(element, ["aria-hidden"]);
            util.removeElementWithClasses(element, ["eoc-chapter-groups", "chapter-nav", "paragraph-tools", "related-stories-block"]);
        });

        // get all spans with data-fcnc-rev="1" and reverse the text inside them
        content.querySelectorAll("span[data-fcnc-rev='1']").forEach(span => {
            span.textContent = span.textContent.split("").reverse().join("");
        });

        util.unwrapAllOfTag(content, "span");

        super.customRawDomToContentStep(chapter, content);
    }
}

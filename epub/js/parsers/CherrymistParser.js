"use strict";

// Cherrymist Cafe is a client-rendered app: fetched pages are an empty shell. The
// story info and full chapter list come from the site's JSON API (the story page
// only shows 20 chapters at a time, paged client-side with no links), and chapter
// content needs Live Mode (see OVERRIDES in generate-parser-registry.js) since it's
// only rendered in a signed-in tab.
parserFactory.register("cherrymist.cafe", () => new CherrymistParser());

class CherrymistParser extends Parser {
    constructor() {
        super();
    }

    static async fetchApiJson(path) {
        // The API 404s without the header the site's own client sends
        let options = { headers: { "X-CM-Reader": "1" } };
        return (await HttpClient.fetchJson("https://cherrymist.cafe/api" + path, options)).json;
    }

    // Story slug from a /story/{slug} URL, or from a chapter page's link back to its story
    static findStorySlug(dom) {
        let path = new URL(dom.baseURI).pathname;
        let link = dom.querySelector("h1")?.parentElement?.querySelector("a[href^='/story/']");
        if (!path.startsWith("/story/") && link) {
            path = new URL(link.getAttribute("href"), dom.baseURI).pathname;
        }
        return path.match(/^\/story\/([^/]+)/)?.[1];
    }

    async loadEpubMetaInfo(dom) {
        let slug = CherrymistParser.findStorySlug(dom);
        if (!slug) {
            throw new Error("Could not find the story on this page. Open the story's page and try again.");
        }
        this.series = await CherrymistParser.fetchApiJson("/series/" + slug);
    }

    async getChapterUrls(dom) {
        if (!this.series) {
            await this.loadEpubMetaInfo(dom);
        }
        let chapters = await CherrymistParser.fetchApiJson("/chapters?series_id=" + this.series.id);
        return chapters
            .sort(CherrymistParser.compareChapters)
            .map(c => ({
                sourceUrl: this.chapterUrl(c),
                title: c.title,
                // Advanced chapters cost cherries until their scheduled free date
                isIncludeable: c.price_type === "free"
            }));
    }

    // Same order as the site's chapter list: numbered chapters by number and part,
    // then any unnumbered ones in the order they were created
    static compareChapters(a, b) {
        let key = c => {
            let num = Number(c.chapter_number);
            let numbered = c.chapter_number != null && Number.isFinite(num) && 0 <= num;
            return numbered
                ? [0, num, Number(c.part_number ?? 0), Number(c.id)]
                : [1, 0, 0, Number(c.id)];
        };
        let ka = key(a);
        let kb = key(b);
        for (let i = 0; i < ka.length; i++) {
            if (ka[i] !== kb[i]) {
                return ka[i] - kb[i];
            }
        }
        return 0;
    }

    // Matches the links the site builds: by slug, or by number when a chapter has none
    chapterUrl(chapter) {
        if (chapter.slug) {
            return "https://cherrymist.cafe/chapter/" + chapter.slug;
        }
        let part = chapter.part_number != null ? "-" + chapter.part_number : "";
        return `https://cherrymist.cafe/story/${this.series.slug}/chapter/${chapter.chapter_number}${part}`;
    }

    // Runs in the chapter's tab via Live Mode. The page has two .rich-content blocks:
    // an author note and the chapter body inside .cm-reader-body.
    findContent(dom) {
        return dom.querySelector(".cm-reader-body .rich-content");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1");
    }

    customRawDomToContentStep(chapter, content) {
        // Paragraphs end in an invisible watermark: a run of zero-width (non-)joiners
        // wrapped in word joiners (&NoBreak;&zwnj;&zwj;...&NoBreak;). Remove the whole run
        // rather than every joiner, since a lone zero-width joiner holds multi-part emoji
        // together. Works on text nodes so inline markup inside paragraphs survives.
        let walker = content.ownerDocument.createTreeWalker(content, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
            walker.currentNode.nodeValue = walker.currentNode.nodeValue
                .replace(/\u2060[\u200C\u200D]+\u2060/g, "")
                .replace(/[\u200B\u2060\uFEFF]/g, "");
        }
        // The container's inline style is the reader's display settings (font, size, spacing)
        util.removeAttributes(content, ["style"]);
        CherrymistParser.removeJunkAttributes(content);
    }

    // select-text/data-fw come from the reader; the rest from text pasted out of a chat UI
    static removeJunkAttributes(container) {
        container.querySelectorAll("*").forEach(element => {
            util.removeClasses(element, ["select-text", "font-claude-response-body", "break-words", "whitespace-normal"]);
            util.removeAttributes(element, ["data-fw", "data-sourcepos"]);
        });
    }

    extractTitleImpl(dom) {
        return this.series?.title ?? dom.querySelector("h1");
    }

    extractAuthor(dom) {
        return this.series?.original_author || this.series?.author_name || super.extractAuthor(dom);
    }

    extractSubject() {
        return [...(this.series?.genres ?? []), ...(this.series?.tags ?? [])].join(", ");
    }

    extractDescription() {
        if (!this.series?.synopsis) {
            return "";
        }
        return util.sanitize(this.series.synopsis).body.textContent.trim();
    }

    findCoverImageUrl() {
        return this.series?.cover_image_url ?? null;
    }

    getInformationEpubItemChildNodes() {
        if (!this.series?.synopsis) {
            return [];
        }
        let body = util.sanitize(this.series.synopsis).body;
        CherrymistParser.removeJunkAttributes(body);
        return [...body.children];
    }
}

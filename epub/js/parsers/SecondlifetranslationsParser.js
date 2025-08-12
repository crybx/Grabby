"use strict";

parserFactory.register("secondlifetranslations.com", () => new SecondlifetranslationsParser());

class SecondlifetranslationsParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        let menu = dom.querySelector("button.accordion").nextElementSibling;
        return util.hyperlinksToChapterList(menu);
    }

    customRawDomToContentStep(chapter, content) {
        const cipher = "rhbndjzvqkiexcwsfpogytumalVUQXWSAZKBJNTLEDGIRHCPFOMY";
        let nodes = content.querySelectorAll(".jmbl");
        for (let node of nodes) {
            util.decipher(node, cipher);
            node.classList.remove("jmbl");
        }

        let junkSpans = content.querySelectorAll(".jmbl-ent, .jmbl-disclaimer")
        util.removeElements(junkSpans);
    }

    findContent(dom) {
        return dom.querySelector("div.entry-content");
    }

    extractTitleImpl(dom) {
        return dom.querySelector("h1");
    }

    findChapterTitle(dom) {
        return dom.querySelector("h1.entry-title");
    }

    findCoverImageUrl(dom) {
        let img = dom.querySelector("img.novelcover");
        return img === null ? null : img.src;
    }

    preprocessRawDom(webPageDom) {
        let content = this.findContent(webPageDom);
        util.removeChildElementsMatchingSelector(content, ".code-block");
        let footnotes = [...content.querySelectorAll("span.modern-footnotes-footnote__note")];
        this.moveFootnotes(webPageDom, content, footnotes);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll("div.novel-entry-content")];
    }
}

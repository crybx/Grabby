"use strict";

parserFactory.register("brittanypage43.com", () => new Brittanypage43Parser());

class Brittanypage43Parser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".ct-posts-list li a")]
            .map(this.linkToChapter);
    }

    linkToChapter(link) {
        return {
            sourceUrl:  link.href,
            title: link?.textContent.trim()
        };
    }

    findContent(dom) {
        return dom.querySelector(".chapter-content") ||
            dom.querySelector("article .entry-content") ||
            dom.querySelector("article");
    }

    customRawDomToContentStep(chapter, content) {
        // They're using the jumble font with this cipher, but not on actual chapter content.
        // const cipher = "tonquerzlawicvfjpsyhgdmkbxJKABRUDQZCTHFVLIWNEYPSXGOM";
        // let nodes = content.querySelectorAll(".jum");
        // for (let node of nodes) {
        //     util.decipher(node, cipher);
        //     node.classList.remove("jum");
        // }
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".jum");
        super.removeUnwantedElementsFromContentElement(element);
    }

    findChapterTitle(dom) {
        return dom.querySelector(".page-title")
            || dom.querySelector(".entry-header");

    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".category-featured-image-wrapper");
    }
}

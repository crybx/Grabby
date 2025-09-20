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
        return dom.querySelector("#viewport") ||
            dom.querySelector(".chapter-content") ||
            dom.querySelector("article .entry-content") ||
            dom.querySelector("article");
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".jum");
        util.removeChildElementsMatchingSelector(element, ".cbxwpbkmarkwrap");
        super.removeUnwantedElementsFromContentElement(element);
    }

    customRawDomToContentStep(chapter, content) {
        // for all spans with class="aeg-chunk" set textContent to what is in data-aeg attribute
        content.querySelectorAll("span.aeg-chunk").forEach(span => {
            const dataAeg = span.getAttribute("data-aeg");
            if (dataAeg) {
                span.textContent = dataAeg;
            }
        });
    }

    findChapterTitle(dom) {
        return dom.querySelector(".page-title")
            || dom.querySelector(".entry-header");

    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".category-featured-image-wrapper");
    }
}

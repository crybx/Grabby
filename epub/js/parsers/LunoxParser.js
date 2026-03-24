"use strict";

parserFactory.register("lunoxscans.com", () => new LunoxParser());

class LunoxParser extends MadaraParser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        return [...dom.querySelectorAll(".lunox-chapters-grid a.lunox-chapter-item")]
            .map(a => {
                let isPremium = a.classList.contains("premium") || a.getAttribute("href") === "#";
                return {
                    sourceUrl: a.href,
                    title: a.querySelector(".lunox-chapter-name")?.textContent?.trim() || a.dataset.name?.trim() || a.textContent.trim(),
                    isIncludeable: !isPremium
                };
            })
            .reverse();
    }

    findChapterTitle(dom) {
        return dom.querySelector("#chapter-heading")?.textContent
            || dom.querySelector("ol.breadcrumb li.active")?.textContent
            || super.findChapterTitle(dom);
    }
}

"use strict";

parserFactory.register("global.novelpia.com", () => new GlobalNovelpiaParser());

class GlobalNovelpiaParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        const rows = 9999;
        const sort = "ASC";
        const regex = /\/novel\/(\d+)/;
        const novelId = dom.baseURI.match(regex)?.[0].slice(7);
        const apiUrl = `https://api-global.novelpia.com/v1/novel/episode/cursor-list?novel_no=${novelId}&rows=${rows}&sort=${sort}`;
        try {
            const response = (await HttpClient.fetchJson(apiUrl)).json;
            const data = response.result.list;
            return data.map(chapter => {
                return {
                    sourceUrl: `https://global.novelpia.com/viewer/${chapter.episode_no}`,
                    title: chapter.epi_num + " - " + chapter.epi_title
                };
            });
        } catch (error) {
            ErrorLog.showErrorMessage(error);
        }
    }

    findContent(dom) {
        return Parser.findConstrutedContent(dom);
    }

    extractTitleImpl(dom) {
        return dom.querySelector(".nv-tit");
    }

    extractAuthor(dom) {
        let authorLabel = dom.querySelector(".info-author");
        return authorLabel?.textContent ?? super.extractAuthor(dom);
    }

    extractLanguage(dom) {
        return dom.querySelector("html").getAttribute("lang");
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll(".nv-tag")];
        return tags.map(e => e.textContent.trim()).join(", ");
    }

    extractDescription(dom) {
        return dom.querySelector(".synopsis-text").textContent.trim();
    }

    findChapterTitle(dom) {
        return dom.querySelector(".in-ch-txt");
    }

    findCoverImageUrl(dom) {
        return util.getFirstImgSrc(dom, ".cover-box");
    }

    async fetchChapter(url) {
        let chapterId = url.split("/").pop();
        let metaUrl = `https://api-global.novelpia.com/v1/novel/episode?episode_no=${chapterId}`;
        let metaJson = (await HttpClient.fetchJson(metaUrl)).json;
        let token = metaJson.result._t;
        let contentUrl = `https://api-global.novelpia.com/v1/novel/episode/content?_t=${token}`;
        let contentJson = (await HttpClient.fetchJson(contentUrl)).json;
        return this.jsonToHtml(url, contentJson.result.data, metaJson.result.data.epi_title);
    }

    jsonToHtml(pageUrl, data, title) {
        let newDoc = Parser.makeEmptyDocForContent(pageUrl);
        let header = newDoc.dom.createElement("h1");
        header.textContent = title;
        newDoc.content.appendChild(header);
        let fragments = Object.keys(data)
            .filter(k => k.startsWith("epi_content"))
            .map(k => data[k]);
        let content = util.sanitize("<div>" + fragments.join("") + "</div>");
        util.moveChildElements(content.body, newDoc.content);
        return newDoc.dom;
    }

    removeUnwantedElementsFromContentElement(element) {
        util.removeChildElementsMatchingSelector(element, ".next-epi-btn");
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        return [...dom.querySelectorAll(".nv-synopsis")];
    }

    cleanInformationNode(node) {
        util.removeChildElementsMatchingSelector(node, "button");
        return node;
    }
}

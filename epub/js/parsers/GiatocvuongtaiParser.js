"use strict";

parserFactory.register("giatocvuongtai.com", () => new GiatocvuongtaiParser());


class GiatocvuongtaiParser extends Parser { // eslint-disable-line no-unused-vars
    constructor() {
        super();
    }

    async getChapterUrls() {
        return [];
    }

    findContent(dom) {
        return dom.body;
    }
}

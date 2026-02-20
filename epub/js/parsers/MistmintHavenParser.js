"use strict";

// Parser for mistminthaven.com - a Next.js novel translation site

parserFactory.register("mistminthaven.com", () => new MistmintHavenParser());

class MistmintHavenParser extends Parser {
    constructor() {
        super();
    }

    async getChapterUrls(dom) {
        // Free chapters are in the first tab panel, inside a grid of <a> elements
        let chapters = [...dom.querySelectorAll("[role='tabpanel'] a[href*='/novels/'][title^='Chapter']")]
            .map(a => ({
                sourceUrl: a.href,
                title: a.title || a.querySelector(".font-semibold")?.textContent?.trim(),
                isIncludeable: true
            }));

        // If no tab panel found, try broader selector
        if (chapters.length === 0) {
            chapters = [...dom.querySelectorAll("a[href*='/novels/'][title^='Chapter']")]
                .filter(a => !a.closest("[aria-hidden='true']"))
                .map(a => ({
                    sourceUrl: a.href,
                    title: a.title || a.querySelector(".font-semibold")?.textContent?.trim(),
                    isIncludeable: true
                }));
        }

        return chapters;
    }

    findContent(dom) {
        return dom.querySelector("#chapter-content-text");
    }

    extractTitleImpl(dom) {
        // Index page: h1 in the novel info section
        return dom.querySelector("h1.text-text-primary-button") ||
            dom.querySelector("h1");
    }

    extractAuthor(dom) {
        // The author name is in a span next to a person/user SVG icon
        // Look for the SVG with the person icon path, then get the adjacent span
        let personIcons = dom.querySelectorAll("svg");
        for (let svg of personIcons) {
            let path = svg.querySelector("path[d*='M8 6.66667']") ||
                svg.querySelector("path[d*='M2 13.6']");
            if (path) {
                let container = svg.closest("div");
                let authorSpan = container?.querySelector("span");
                if (authorSpan?.textContent?.trim()) {
                    return authorSpan.textContent.trim();
                }
            }
        }
        return super.extractAuthor(dom);
    }

    extractDescription(dom) {
        let altName = dom.querySelector(".text-text-badge")?.textContent?.trim() || "";
        let desc = dom.querySelector(".whitespace-pre-line")?.textContent?.trim() || "";

        return altName + "\n\n" + desc;
    }

    findChapterTitle(dom) {
        // On chapter pages, the h1 in the reader header has the chapter title
        let h1 = dom.querySelector(".reader-header h1");
        return h1 || dom.querySelector("h1");
    }

    findCoverImageUrl(dom) {
        // The cover image on the index page has aspect-[2/3] parent
        let img = dom.querySelector(".aspect-\\[2\\/3\\] img") ||
            dom.querySelector("img[alt][data-nimg='fill']");
        if (!img) return null;

        // Extract the actual S3 URL from the Next.js image srcset
        let srcset = img.getAttribute("srcset");
        if (srcset) {
            let match = srcset.match(/url=([^&]+)/);
            if (match) {
                return decodeURIComponent(match[1]);
            }
        }
        return img.src || null;
    }

    removeUnwantedElementsFromContentElement(element) {
        // Remove ads
        util.removeElements(element.querySelectorAll("ins.adsbygoogle, section:has(ins.adsbygoogle)"));
        // Remove tooltip/footnote icons (inline SVGs with data-state)
        util.removeElements(element.querySelectorAll("span.inline-block:has(svg)"));
        super.removeUnwantedElementsFromContentElement(element);
    }

    getInformationEpubItemChildNodes(dom) {
        let nodes = [];

        // Build a clean info block with title, metadata, and synopsis
        let infoDiv = dom.ownerDocument.createElement("div");

        // Title
        let title = dom.querySelector("h1.text-text-primary-button");
        if (title) {
            let h2 = dom.ownerDocument.createElement("h2");
            h2.textContent = title.textContent.trim();
            infoDiv.appendChild(h2);
        }

        // Other name / alt title
        let altName = dom.querySelector(".text-text-badge");
        if (altName) {
            let p = dom.ownerDocument.createElement("p");
            p.textContent = altName.textContent.trim();
            infoDiv.appendChild(p);
        }

        // Author, status, and metadata from the info line
        let metaItems = dom.querySelectorAll("h1.text-text-primary-button ~ div .flex.items-center.gap-1 span");
        if (metaItems.length > 0) {
            let p = dom.ownerDocument.createElement("p");
            let texts = [...metaItems].map(s => s.textContent.trim()).filter(t => t);
            p.textContent = texts.join(" | ");
            infoDiv.appendChild(p);
        }

        // Translator badge
        let translator = dom.querySelector("span.bg-\\[\\#5EA0FE\\]");
        if (translator) {
            let p = dom.ownerDocument.createElement("p");
            p.textContent = "Translator: " + translator.textContent.trim();
            infoDiv.appendChild(p);
        }

        // Genres
        let genres = [...dom.querySelectorAll("a[href*='?genres=']")];
        if (genres.length > 0) {
            let p = dom.ownerDocument.createElement("p");
            p.textContent = "Genres: " + genres.map(g => g.textContent.trim()).join(", ");
            infoDiv.appendChild(p);
        }

        if (infoDiv.children.length > 0) {
            nodes.push(infoDiv);
        }

        // Synopsis
        let synopsis = dom.querySelector(".whitespace-pre-line");
        if (synopsis) {
            let synDiv = dom.ownerDocument.createElement("div");
            let h3 = dom.ownerDocument.createElement("h3");
            h3.textContent = "Synopsis";
            synDiv.appendChild(h3);
            let content = synopsis.cloneNode(true);
            synDiv.appendChild(content);
            nodes.push(synDiv);
        }

        return nodes;
    }

    extractSubject(dom) {
        let tags = [...dom.querySelectorAll("a[href*='?genres=']")];
        return tags.map(t => t.textContent?.trim()).join(", ");
    }

    extractLanguage() {
        return "en";
    }
}

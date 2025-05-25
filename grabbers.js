function grabKakaoPage() {
    const shadowHost = document.querySelector("#__next > div > div.flex > div > div > div.mx-auto > div.h-full > div > div");
    const shadowRoot = shadowHost.shadowRoot;
    const content = shadowRoot.querySelector(".DC2CN") ||
        shadowRoot.querySelector(".DC1CN");
    content.querySelectorAll("*").forEach(element => {
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeAttributes(element, ["id", "data-p-id", "data-original-font-size", "data-original-line-height"]);
    });
    utils.unwrapAllOfTag(content, "font");
    return content.innerHTML.trim();
}

function grabRidi() {
    let title = document.querySelector("title").textContent;
    // remove " – Ridi" from the title
    title = title.replace(" - Ridi", "");

    // Ridi can have multiple articles, create a container
    const content = document.createElement("div");
    // move all children of articles to the container
    document.querySelectorAll("article").forEach(article => {
        article.childNodes.forEach(node => {
            content.appendChild(node.cloneNode(true));
        });
    });

    utils.removeComments(content);
    content.querySelectorAll("*").forEach(element => {
        utils.removeTags(element, ["PRE", "TITLE", "LINK"]);
        utils.removeClassesThatStartWith(element, "block_");
        utils.removeClasses(element, ["body", "story_part_header_title"]);
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeEmptyParagraphAndHeadings(element);
    });
    utils.unwrapAllOfTag(content, "font");
    utils.ensureHeading(content, title);

    return content.innerHTML;
}

function grabPublang() {
    const iframe = document.querySelector("iframe");
    const srcdoc = iframe.getAttribute("srcdoc");

    let temp = document.createElement("div");
    temp.innerHTML = srcdoc;
    temp.querySelectorAll("*").forEach(element => {
        utils.removeTags(element, ["LINK", "BASE", "META"]);

        if (element.tagName === "TITLE") {
            element.outerHTML = "<h1>" + element.innerHTML + "</h1>";
        }
    });
    return temp.innerHTML;
}

function grabSyosetu() {
    const title = document.querySelector(".p-novel__title");
    const content = document.querySelector("div.p-novel__body");

    utils.unwrapAllOfTag(title, "font");
    utils.unwrapAllOfTag(content, "font");
    content.querySelectorAll("*").forEach(element => {
        if (element.tagName === "P") {
            element.removeAttribute("id");
            element.textContent = element.textContent.trim();
        }
    });
    return title.outerHTML.trim() + "\n\n" + content.innerHTML.trim();
}

function grabTapas() {
    const pageTitle = document.querySelector("title").textContent.trim();
    let title = document.querySelector("div.viewer__header p.title").textContent.trim();
    title = pageTitle + " " + title;
    title = title.replace("Read", "")?.trim();

    const content = document.querySelector("#viewport");
    content.querySelectorAll("*").forEach(element => {
        utils.removeAttributes(element, ["dir", "role", "lang"]);
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeClasses(element, ["MsoNormal"]);
        utils.removeIdsThatStartWith(element, "docs-internal-guid-");

        // tag <w:sdt> is not valid XHTML, convert it to span with class="sdttag"
        if (element.tagName && element.tagName.toLowerCase() === "w:sdt") {
            utils.removeAttributes(element, ["id", "sdttag"]);
            const spanElement = element.ownerDocument.createElement("span");
            spanElement.classList.add("sdttag");
            utils.replaceTag(element, spanElement);
        }
        utils.standardElementCleanup(element);
    });
    utils.standardContentCleanup(content);

    return `<h1>${title}</h1>\n\n${content.innerHTML.trim()}`;
}

function grabJoara() {
    const content = document.querySelector(".text-wrap");
    content.querySelectorAll("*").forEach(element => {
        utils.removeTag(element, "SMALL")
        if (element.tagName === "P") {
            element.textContent = element.textContent.trim();
        }
    });
    utils.unwrapAllOfTag(content, "font");
    return content.innerHTML;
}

function grabChrysanthemum() {
    const title = document.querySelector(".entry-title").querySelector(".chapter-title").textContent;
    const content = document.querySelector("#novel-content");
    const cipher = "tonquerzlawicvfjpsyhgdmkbxJKABRUDQZCTHFVLIWNEYPSXGOM";

    content.querySelectorAll("*").forEach(element => {
        if (element.tagName === "DIV") {
            if (element.classList.contains("chrys-iklan")) {
                element.outerHTML = "";
            }
        } else {
            const elementStyle = element.getAttribute("style");
            if (elementStyle?.includes("height:1px")) {
                element.outerHTML = "";
            }
        }

        if (element.classList.contains("jum")) {
            utils.cipherSubstitution(element, cipher);
        }
        utils.removeClasses(element, ["jum", "emoji"]);
    });
    return "<h1>" + title + "</h1>" + "\n\n" + content.innerHTML;
}

function grabSecondLifeTranslations() {
    const content = document.querySelector(".entry-content");
    const title = document.querySelector(".entry-title").textContent;
    const cipher = "rhbndjzvqkiexcwsfpogytumalVUQXWSAZKBJNTLEDGIRHCPFOMY";

    content.querySelectorAll("*").forEach(element => {
        if (element.classList.contains("jmbl")) {
            utils.cipherSubstitution(element, cipher);
        }
        utils.removeClasses(element, ["jmbl"]);
        utils.removeElementWithClasses(element, ["jmbl-ent", "jmbl-disclaimer"]);
        utils.standardElementCleanup(element);
    });
    utils.standardContentCleanup(content);

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabGoogleDocMobileBasic() {
    const content = document.querySelector(".doc-content");
    const headings = ["H1", "H2", "H3", "H4", "H5", "H6"];

    content.querySelectorAll("*").forEach(element => {
        element.removeAttribute("style");
        // if element contains "table of contents", remove the element
        if (element.textContent.toLowerCase().includes("table of contents")) {
            element.remove();
        }
        // if element contains "docs.google.com", remove the element
        else if (element.textContent.toLowerCase().includes("docs.google.com")) {
            element.remove();
        }
        else if (element.tagName === "SPAN" || element.tagName === "A") {
            // remove "span" and "a" tag elements while keeping the inner text
            element.outerHTML = element.innerHTML;
        }
        // if element is a heading, remove the "id" attribute
        else if (headings.includes(element.tagName)) {
            element.removeAttribute("id");
        }
    });
    return content.innerHTML.trim();
}

function grabBlogspot() {
    const title = document.querySelector(".entry-title").textContent;
    const content = document.querySelector(".entry-content");

    // remove all elements that appear after the text "Next Chapter" shows up
    let nextChapter = false;

    content.querySelectorAll("*").forEach(element => {
        if (element.textContent.toLowerCase().includes("next chapter")) {
            nextChapter = true;
        }
        if (nextChapter) {
            element.remove();
        } else {
            utils.standardElementCleanup(element);
        }
    });
    utils.unwrapAllOfTag(content, "A");
    utils.standardContentCleanup(content);

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function madaraWpTheme() {
    const title =
        document.querySelector("ol.breadcrumb li.active")?.textContent ||
        document.querySelector("#chapter-heading")?.textContent ||
        document.querySelector(".wp-block-heading")?.textContent ||
        "";
    const content =
        document.querySelector(".text-left") ||
        document.querySelector(".entry-content_wrap");

    content.querySelectorAll("*").forEach(element => {
        utils.removeSpansInsideParagraph(element);
        utils.removeTags(element, ["SCRIPT", "INS", "DIV"]);
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabWatashiWaSugoiDesu() {
    const content = document.querySelector("#wtr-content");

    content.querySelectorAll("*").forEach(element => {
        utils.removeAttributes(element, ["class", "style"]);
        utils.removeTags(element, ["SCRIPT", "SELECT"]);
        utils.removeElementWithClasses(element, ["ezoic-autoinsert-ad"]);
        utils.removeElementWithAttributes(element, ["data-ez-ph-id"]);
    });
    return content.innerHTML.trim();
}

function grabHyacinth() {
    let title = document.querySelector(".ts-breadcrumb").textContent;
    // replace all \n and \t with space
    title = title.replace(/[\n\t]/g, " ");
    // remove "Home" and "›"
    title = title.replace(/Home|›/g, "");
    // replace all multiple whitespaces in a row with a single space
    title = title.replace(/\s+/g, " ").trim();

    const content = document.querySelector(".entry-content");
    content.querySelectorAll("*").forEach(element => {
        utils.replaceSemanticInlineStylesWithTags(element, true);
        // utils.trimWhitespace(element); (this is removing <b> tags?
        utils.standardElementCleanup(element);
    });
    utils.removeEmptyDivElements(content);
    utils.standardContentCleanup(content);

    return `<h1>${title}</h1>\n\n${content.innerHTML.trim()}`;
}

function grabJjwxc() {
    const title = document.querySelector(".noveltitle").textContent.trim();
    const content = document.querySelector(".novelbody");

    content.querySelectorAll("*").forEach(element => {
        replaceSemanticInlineStylesWithTags(element, true);
    });

    return `<h1>${title}</h1>\n\n${content.innerHTML.trim()}`;
}

function grabStorySeedling() {
    //content is in <div x-html="content">
    const content = document.querySelector('div[x-html="content"]');
    let title = document.querySelector("title").textContent.trim();
    const cipher = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const alphab = "⽂⽃⽄⽅⽆⽇⽈⽉⽊⽋⽌⽍⽎⽏⽐⽑⽒⽓⽔⽕⽖⽗⽘⽙⽚⽛⽜⽝⽞⽟⽠⽡⽢⽣⽤⽥⽦⽧⽨⽩⽪⽫⽬⽭⽮⽯⽰⽱⽲⽳⽴⽵";
    const warn = " This content is owned by Story Seedling. If you are reading this on a site other than storyseedling.com, please report it to us.";

    // get textContent of div with classes font-medium and max-w-2x1
    let storyTitle = document.querySelector(".font-medium.max-w-2xl")?.textContent?.trim();
    if (storyTitle) {
        title = `${storyTitle} ${title}`;
    }

    utils.standardContentCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        // remove all instances of cls followed by 18 other characters that are not whitespace
        // e.g. clsf7ee7eab1744489659
        element.textContent = element.textContent.replace(/cls[^\s]{18}/g, "");
        utils.cipherSubstitution(element, cipher, alphab);
        // replace warn with nothing
        element.textContent = element.textContent.replace(warn, "");
        utils.removeAttributes(element, ["class"]);
    });
    return `<h1>${title}</h1>\n\n${content.innerHTML.trim()}`;
}

function grabRequiemtls() {
    let content = document.querySelector(".entry-content");
    const cipher = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*.!?,;:\"'-[()]0123456789~"
    const alphab = "რსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჀჁჂჃჄჅ჆Ⴧ჈჉K჋჌Ⴭ჎჏QბგდევზXიZႩႭႠႾႫ;:ႡႦႬლႧႨნႯႰ234ႴႵ789ჽ"
    // the alphabet changes between pages! this only works on a few pages right now
    // apparently the fonts can be downloaded, check them out

    content = standardCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        utils.cipherSubstitution(element, cipher, alphab);
    });

    return content.innerHTML.trim();
}

function grabFictioneer() {
    let storyName = document.querySelector(".chapter__story-link")?.textContent;
    let title = document.querySelector(".chapter__title")?.textContent;
    let subtitle = document.querySelector(".chapter__second-title")?.textContent ||
        document.querySelector(".chapter__group")?.textContent;
    if (subtitle) { title += ": " + subtitle; }
    if (storyName) { title = storyName + ": " + title; }

    let content = document.querySelector(".chapter-formatting") ||
        document.querySelector("#chapter-content");

    const footnotes = document.querySelector(".chapter__footnotes");

    content.querySelectorAll("*").forEach(element => {
        utils.removeSpansInsideParagraph(element);
        utils.removeAttributes(element, ["id", "data-paragraph-id"]);
        utils.removeElementWithClasses(element, ["eoc-chapter-groups", "chapter-nav", "paragraph-tools"]);
    });
    content = `<h1>${title.trim()}</h1>\n\n${content.innerHTML.trim()}`;
    if (footnotes) { content += "\n\n" + footnotes.innerHTML; }

    return content;
}

function grabPatreon() {
    const content = document.querySelector("body");

    // add all <p> and header tags to the fullText
    let fullText = "";
    content.querySelectorAll("p, h1, h2, h3, h4, h5, h6").forEach(element => {
        fullText += element.outerHTML;
    });

    return fullText;
}

function grabYoruWorld() {
    const title = document.querySelector(".text-2xl").textContent;

    // the content is inside the section tag
    // it is in the first div that has a class that starts with __className_
    let content = document.querySelector("section");
    content = content.querySelector('div[class^="__className_"]');

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + standardCleanup(content).innerHTML;
}

function grabStarlightStream() {
    const content = document.querySelector('[data-id="content-viewer"]');
    const title = document.querySelector("title").textContent;

    content.querySelectorAll("*").forEach(element => {
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.standardElementCleanup(element);
    });
    utils.unwrapAllOfTag(content, "span");
    utils.standardContentCleanup(content);

    // get all the p tags
    let fullText = "";
    content.querySelectorAll("p").forEach(element => {
        fullText += "<p>" + element.innerHTML + "</p>";
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + fullText;
}

function grabNovelingua() {
    // title is in the canonical link
    let canonical = document.querySelector("link[rel='canonical']").href.split("/");
    let title = canonical.pop();
    if (title === "") {
        title = canonical.pop();
    }
    title = title.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

    const content = document.querySelector(".entry-content")
    content.querySelectorAll("*").forEach(element => {
        element.removeAttribute("dir");
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeIdsThatStartWith(element, "docs-internal-guid-");
        utils.removeElementWithClasses(element, [
            "pagelayer-btn-holder", "pagelayer-share", "pagelayer-anim-par",
            "pagelayer-image_slider", "pagelayer-embed"
        ])
        utils.removeClasses(element, ["pagelayer-text-holder"])
        utils.standardElementCleanup(element);
    });
    utils.standardContentCleanup(content);
    utils.unwrapAllOfTag(content, "div");

    // now that everything is flatter inside content, look for the end of the content
    let contentEnded = false;
    content.querySelectorAll("*").forEach(element => {
        if (contentEnded) {
            element.remove();
        } else if (element.textContent.toLowerCase().includes("please rate and review this novel on")) {
            contentEnded = true;
            element.remove();
        }
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabZenithtls() {
    const content = document.querySelector("article");
    // title is all the text inside the ol tag inside header tag, with the li items in reverse order
    let title = "";
    const ol = document.querySelector("header ol");

    if (ol) {
        const li = ol.querySelectorAll("li");
        for (let i = li.length - 1; i >= 0; i--) {
            //title += li[i].textContent + " ";
            // skip if it is Home or /
            if (li[i].textContent === "Home" || li[i].textContent === "/") {
                continue;
            }
            title += li[i].textContent + "_";
        }
        // replace all spaces and apostrophes with underscores
        title = title.replace(/ /g, "_");
        // remove apostrophes and make sure to properly escape the ' character in the regex
        title = title.replace(/'/g, "");
    }

    utils.standardContentCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        utils.standardElementCleanup(element);

        // if element is div or span, remove it but keep the inner text
        if (element.tagName === "DIV" || element.tagName === "SPAN") {
            try {
                element.outerHTML = element.innerHTML;
            } catch (e) {
                console.log(e);
            }
        }
    });

    // if element is P, replace all newlines with </p><p>
    content.querySelectorAll("p").forEach(element => {
        element.innerHTML = element.innerHTML.replace(/\n/g, "</p>\n<p>");
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabReadhive() {
    // content is in div with class "prose"
    const content = document.querySelector(".prose");
    let title = document.querySelector("title").textContent;
    // remove " – Readhive" from the title
    title = title.replace(" – Readhive", "");

    utils.standardContentCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        utils.standardElementCleanup(element);
        // remove "span" tag elements while keeping the inner text
        if (element.tagName === "SPAN") {
            element.outerHTML = element.innerHTML;
        }
        utils.removeElementWithClasses(element, ["absolute", "fixed", "flex", "sticky"]);
        utils.removeAttributes(element, ["@click"]);
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabPeachTeaAgency() {
    const content = document.querySelector(".transition-all");
    // title is all the text inside the ol tag inside nav tag, with the li items
    let title = "";
    const ol = document.querySelector("nav ol");

    if (ol) {
        const li = ol.querySelectorAll("li");
        for (let i = 1; i < li.length; i++) {
            // text is in the a tag
            title += li[i].querySelector("a").textContent + " ";
        }

        // replace all spaces and apostrophes with underscores
        title = title.trim().replace(/ /g, "_");
        // remove apostrophes and make sure to properly escape the ' character in the regex
        title = title.replace(/'/g, "");
    }

    // TODO: make this a util function
    // wrap raw text in p tags
    // Find text nodes that are direct children of the content div
    const textNodes = [];
    const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        { acceptNode: node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== "" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
    );

    while (walker.nextNode()) {
        const node = walker.currentNode;
        // Only process text nodes that are direct children of the content div
        if (node.parentNode === content) {
            textNodes.push(node);
        }
    }

    // Replace each text node with a paragraph
    textNodes.forEach(node => {
        const text = node.nodeValue.trim();
        if (text) {
            const p = document.createElement("p");
            p.textContent = text;
            node.parentNode.replaceChild(p, node);
        }
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + standardCleanup(content).innerHTML;
}

function grabAO3() {
    // content is in the first div with the class .chapter
    const content = document.querySelector("div.chapter");
    // title is the h2 tag with the classed "title heading" + the text of h3 class "title"
    let title = document.querySelector(".title.heading").textContent.trim();
    title += " - " + document.querySelector("h3.title").textContent.trim();

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

function grabLocalFile() {
    const content = document.querySelector("body");
    content.querySelectorAll("*").forEach(element => {
        utils.removeElementWithIds(element, ["goog-gt-tt", "grabby-button"]);
    });
    utils.unwrapAllOfTag(content, "font");
    return content.innerHTML.trim();
}

function grabFenrir() {
    const content = document.querySelector("#reader-area");
    const title = document.querySelector("h1")?.textContent
    ??  document.querySelector("title").textContent;

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + standardCleanup(content).innerHTML;
}

function grabNovelTranslationNet() {
    // This is trash that does not work in the extension, but works
    // fine in the browser console. Why???
    const content = document.querySelector("pre");
    return content.textContent;
}

function grabKaristudio() {
    const content = document.querySelector("article");
    const title = document.querySelector(".title").textContent;

    utils.standardContentCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        utils.standardElementCleanup(element);
        utils.removeClasses(element, ["chapter_content"]);
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

/**
 * Creates a standard grabber function
 * @param {string} [contentSelector="body"] - Selector for content
 * @param {string|null} [titleSelector="title"] - Selector for title, null to skip title
 * @returns {Function} Grabber function
 */
function grabStandard(contentSelector = "body", titleSelector = "title") {
    // Return a function that closes over the selectors
    return function() {
        let result = "";
        if (titleSelector !== null) {
            const title = document.querySelector(titleSelector)?.textContent || "";
            result += `<h1>${title.trim()}</h1>\n\n`;
        }

        const content = document.querySelector(contentSelector);
        standardCleanup(content);
        result += content.innerHTML.trim();
        return result;
    };
}

function standardCleanup(content) {
    content.querySelectorAll("*").forEach(element => {
        utils.standardElementCleanup(element);
    });
    utils.standardContentCleanup(content);
    return content;
}

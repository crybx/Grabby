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
    title = title.replace(" - Ridibooks", "");

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
            const hElement = document.createElement("H1");
            utils.replaceTag(element, hElement);
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
        utils.removeTag(element, "SMALL");
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
                utils.removeElements(element);
                return;
            }
        } else {
            const elementStyle = element.getAttribute("style");
            if (elementStyle?.includes("height:1px")) {
                utils.removeElements(element);
                return;
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
        utils.replaceSemanticInlineStylesWithTags(element, true);
        // if element contains "table of contents", remove the element
        if (element.textContent.toLowerCase().includes("table of contents")) {
            element.remove();
        }
        // if element contains "docs.google.com", remove the element
        else if (element.textContent.toLowerCase().includes("docs.google.com")) {
            element.remove();
        }
        // if element is a heading, remove the "id" attribute
        else if (headings.includes(element.tagName)) {
            element.removeAttribute("id");
        }
    });
    utils.unwrapAllOfTag(content, "SPAN");
    utils.unwrapAllOfTag(content, "A");
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
    const chapter =
        document.querySelector(".selectpicker_chapter .selected")?.textContent ||
        document.querySelector("ol.breadcrumb li.active")?.textContent ||
        document.querySelector("#chapter-heading")?.textContent ||
        document.querySelector(".wp-block-heading")?.textContent ||
        "";
    let title = document.querySelector("title")?.textContent;
    title += chapter;

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
        utils.replaceSemanticInlineStylesWithTags(element, true);
    });

    return `<h1>${title}</h1>\n\n${content.innerHTML.trim()}`;
}

function grabStorySeedling() {
    // Capture all data from DOM first to avoid triggering site's navigation
    const originalContent = document.querySelector("div[x-html=\"content\"]");
    let title = document.querySelector("title").textContent.trim();
    let storyTitle = document.querySelector(".font-medium.max-w-2xl")?.textContent?.trim();
    
    // Clone the content to avoid triggering site's DOM change detection
    const content = originalContent.cloneNode(true);
    const cipher = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    const alphab = "⽂⽃⽄⽅⽆⽇⽈⽉⽊⽋⽌⽍⽎⽏⽐⽑⽒⽓⽔⽕⽖⽗⽘⽙⽚⽛⽜⽝⽞⽟⽠⽡⽢⽣⽤⽥⽦⽧⽨⽩⽪⽫⽬⽭⽮⽯⽰⽱⽲⽳⽴⽵";
    const warn = " This content is owned by Story Seedling. If you are reading this on a site other than storyseedling.com, please report it to us.";

    // Build final title from captured data
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
    const cipher = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ*.!?,;:\"'-[()]0123456789~";
    const alphab = "რსტუფქღყშჩცძწჭხჯჰჱჲჳჴჵჶჷჸჹჀჁჂჃჄჅ჆Ⴧ჈჉K჋჌Ⴭ჎჏QბგდევზXიZႩႭႠႾႫ;:ႡႦႬლႧႨნႯႰ234ႴႵ789ჽ";
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

function grabLilyonthevalley() {
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
        // if it's a p tag and does not have attribute data-paragraph-id, remove it
        if (element.tagName === "P" && !element.hasAttribute("data-paragraph-id")) {
            element.remove();
            return;
        }
        // if it's a span, and it's only hexadecimal: `<span class="[^"]*">[a-f0-9]+</span>`
        if (element.tagName === "SPAN"
            && element.classList?.length === 1
            && /^[a-f0-9]+$/.test(element.textContent)) {
            element.remove();
            return;
        }
        utils.removeAttributes(element, ["id", "data-paragraph-id"]);
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeElementWithClasses(element, ["eoc-chapter-groups", "chapter-nav", "paragraph-tools", "related-stories-block"]);
    });
    utils.unwrapAllOfTag(content, "span");
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
    content = content.querySelector("div[class^=\"__className_\"]");

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + standardCleanup(content).innerHTML;
}

function grabStarlightStream() {
    const content = document.querySelector("[data-id=\"content-viewer\"]");
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
    const dom = document.cloneNode(true);

    // title is in the canonical link
    let canonical = dom.querySelector("link[rel='canonical']").href.split("/");
    let title = canonical.pop();
    if (title === "") {
        title = canonical.pop();
    }
    title = title.split("-").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");

    const content = dom.querySelector(".entry-content");
    content.querySelectorAll("*").forEach(element => {
        element.removeAttribute("dir");
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.removeIdsThatStartWith(element, "docs-internal-guid-");
        utils.removeElementWithClasses(element, [
            "pagelayer-btn-holder", "pagelayer-share", "pagelayer-anim-par",
            "pagelayer-image_slider", "pagelayer-embed"
        ]);
        utils.removeClasses(element, ["pagelayer-text-holder"]);
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
                utils.unwrapTag(element);
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
            utils.unwrapTag(element);
        }
        utils.removeElementWithClasses(element, ["absolute", "fixed", "flex", "sticky"]);
        utils.removeAttributes(element, ["@click"]);
    });

    return "<h1>" + title.trim() + "</h1>" + "\n\n" + content.innerHTML.trim();
}

async function grabPeachTeaAgency() {
    let dom = document.cloneNode(true);

    // title is all the text inside the ol tag inside nav tag, with the li items
    let title = "";
    const ol = dom.querySelector("nav ol");

    if (ol) {
        const li = ol.querySelectorAll("li");
        for (let i = 1; i < li.length; i++) {
            // text is in the a tag
            title += li[i].querySelector("a").textContent + " ";
        }
    }
    dom.querySelectorAll(".text-lg").forEach(element => {
        // if textContent contains [number] or Episode, then it's the episode
        if (element.textContent.match(/\[\d+\]/) || element.textContent.toLowerCase().includes("episode")) {
            let episode = element.textContent.trim();
            // Add episode to title if found
            if (episode) {
                title = `${title} ${episode}`;
                // add a space after ]
                title = title.replace(/\]/g, "] ");
            }
        }
    });

    // Collect all the text
    let collectedDivs = []; // Store divs with their loop number
    let lastContentSnapshot = ""; // Track content to detect changes
    let noNewContentIterations = 0;
    const maxIterations = 25; // Max iterations to prevent infinite loops
    
    // Keep scrolling until we reach the bottom or stop finding new content
    for (let i = 0; i < maxIterations; i++) {
        // Check if we've reached the bottom of the page
        const isAtBottom = (window.innerHeight + window.scrollY) >= document.documentElement.scrollHeight - 10;
        
        dom = document.cloneNode(true);
        const contentDivs = dom.querySelectorAll(".transition-all > div > div");
        
        // Store all divs from this loop with their loop number
        const divsFromThisLoop = [];
        contentDivs.forEach(div => {
            divsFromThisLoop.push({
                element: div,
                loopNumber: i,
                textContent: div.textContent.trim()
            });
        });
        
        // Create a snapshot of current content to compare
        const currentContentSnapshot = divsFromThisLoop.map(d => d.textContent).join("|");

        // Check if the content has changed from last iteration
        if (currentContentSnapshot === lastContentSnapshot && i > 0) {
            noNewContentIterations++;
            
            // If no new content for 2 iterations or we're at the bottom, stop
            if (noNewContentIterations >= 2 || isAtBottom) {
                break;
            }
        } else {
            noNewContentIterations = 0;
            lastContentSnapshot = currentContentSnapshot;
        }
        
        // Always add the divs we found (we'll dedupe later)
        collectedDivs.push(...divsFromThisLoop);
        
        // If we're already at the bottom, no need to scroll more
        if (isAtBottom) {
            break;
        }
        
        window.scrollBy({
            top: window.innerHeight * 0.75,
            behavior: "smooth"
        });
        
        // Wait for content to load
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    
    // First, remove items with no textContent and "Scroll down to continue reading" prompts
    let filteredDivs = collectedDivs.filter(item => {
        return item.textContent !== "" && 
               item.textContent !== "Scroll down to continue reading";
    });
    // Now remove duplicates that overlap between loops only
    let finalDivs = [];
    
    // Group divs by loop number for easier processing
    const divsByLoop = {};
    filteredDivs.forEach(div => {
        if (!divsByLoop[div.loopNumber]) {
            divsByLoop[div.loopNumber] = [];
        }
        divsByLoop[div.loopNumber].push(div);
    });
    
    // Process each loop
    const loopNumbers = Object.keys(divsByLoop).map(n => parseInt(n)).sort((a, b) => a - b);
    
    for (let loopIdx = 0; loopIdx < loopNumbers.length; loopIdx++) {
        const currentLoopNum = loopNumbers[loopIdx];
        const currentLoopDivs = divsByLoop[currentLoopNum];
        
        if (loopIdx === 0) {
            // First loop - keep everything
            finalDivs.push(...currentLoopDivs);
        } else {
            // For subsequent loops, remove items that appeared at the end of previous loop
            const previousLoopNum = loopNumbers[loopIdx - 1];
            const previousLoopDivs = divsByLoop[previousLoopNum];
            
            // Find the longest overlap between end of previous loop and start of current loop
            let overlapLength = 0;
            
            // Start from the largest possible overlap and work down
            const maxOverlap = Math.min(currentLoopDivs.length, previousLoopDivs.length);
            
            for (let checkLength = maxOverlap; checkLength > 0; checkLength--) {
                let isMatch = true;
                
                // Check if the last 'checkLength' items of previous loop match
                // the first 'checkLength' items of current loop
                for (let j = 0; j < checkLength; j++) {
                    const prevIdx = previousLoopDivs.length - checkLength + j;
                    if (previousLoopDivs[prevIdx].textContent !== currentLoopDivs[j].textContent) {
                        isMatch = false;
                        break;
                    }
                }
                
                if (isMatch) {
                    overlapLength = checkLength;
                    break;
                }
            }
            
            // Add non-overlapping divs from current loop
            if (overlapLength > 0) {
                // Keep only items after the overlap
                finalDivs.push(...currentLoopDivs.slice(overlapLength));
            } else {
                // No overlap found, keep all divs from this loop
                finalDivs.push(...currentLoopDivs);
            }
        }
    }
    
    // Extract just the elements for further processing
    let allContentDivs = finalDivs.map(item => item.element);

    // Now format and return
    let allContent = "";
    // for each div in allContentDivs
    allContentDivs.forEach(contentDiv => {
        contentDiv.querySelectorAll("*").forEach(element => {
            utils.replaceSemanticInlineStylesWithTags(element, true);
            util.removeAttributes(element, ["data-reader-disable"]);
            // If tag is div, replace with p
            if (element.tagName === "DIV") {
                const pElement = dom.createElement("p");
                utils.replaceTag(element, pElement);
            }
            utils.standardElementCleanup(element);
        });
        utils.standardContentCleanup(contentDiv);
        allContent += standardCleanup(contentDiv).innerHTML;
    });

    // convert title to Title case
    title = title.split(" ").map(word => {
        if (word.length === 0) return word;
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    }).join(" ");
    return "<h1>" + title.trim() + "</h1>" + allContent;
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

function grabWebnovel() {
    const contentOrig = document.querySelector(".chapter_content");
    // create a clone of the content to not disrupt the original content
    const content = contentOrig.cloneNode(true);

    utils.standardContentCleanup(content);
    content.querySelectorAll("*").forEach(element => {
        utils.removeClasses(element, ["db", "pr", "hover-light"]);
        utils.removeClassesThatStartWith(element, ["cha-", "j_para", "_font_"]);
        utils.removeAttributesThatStartWith(element, ["data-"]);
        utils.removeElementWithClasses(element, ["_avatar", "user-link", "add-a-para-comment"]);
        utils.removeElementWithClassesThatStartWith(element, ["j_comment", "para-comment", "user-link"]);
        utils.replaceSemanticInlineStylesWithTags(element, true);
        utils.standardElementCleanup(element);
    });
    utils.unwrapAllOfTag(content, "div");

    return content.innerHTML.trim();
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
        const dom = document.cloneNode(true);
        let result = "";
        if (titleSelector !== null) {
            const title = dom.querySelector(titleSelector)?.textContent || "";
            result += `<h1>${title.trim()}</h1>\n\n`;
        }

        const content = dom.querySelector(contentSelector);
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

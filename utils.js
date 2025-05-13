function removeTag(element, tagName) {
    if (element.tagName === tagName) {
        element.remove();
    }
}

function removeTags(element, tagNames) {
    if (tagNames.includes(element.tagName)) {
        element.remove();
    }
}

function removeTagsFromContent(content, tagNames) {
    for (let tagName of tagNames) {
        let elements = content?.querySelectorAll(tagName);
        if (elements?.length > 0) {
            removeElements(elements);
        }
    }
}

function removeElements(elements) {
    for (let e of elements) {
        e.remove();
    }
}

function removeElementWithClasses(element, classNames) {
    for (let className of classNames) {
        if (element.classList.contains(className)) {
            element.remove();
        }
    }
}

function removeElementWithAttributes(element, attributes) {
    for (let attribute of attributes) {
        if (element.hasAttribute(attribute)) {
            element.remove();
        }
    }
}

function removeElementWithIds(element, ids) {
    for (let id of ids) {
        if (element.id === id) {
            element.remove();
        }
    }
}

function removeFontTags(element) {
    let fontTag = element.querySelector("font");
    if (!fontTag) { return; }

    let innerHTML = fontTag.innerHTML;
    // if the first child of the "font" tag is also a "font" tag, get the innerHTML of the second "font" tag
    if (fontTag.children.length > 0 && fontTag.children[0].tagName === "FONT") {
        innerHTML = fontTag.children[0].innerHTML;
    }
    fontTag.outerHTML = innerHTML;
}

function removeSpansInsideParagraph(element) {
    if (element.tagName === "P") {
        element.querySelectorAll("span").forEach(span => {
            span.outerHTML = span.innerHTML;
        });
    }
}

function removeEmptyParagraphAndHeadings(element) {
    const tagsToCheck = ["P", "H1", "H2", "H3", "H4", "H5", "H6"];
    if (tagsToCheck.includes(element.tagName)) {
        if (element.children.length === 0 && element.textContent.trim() === "") {
            element.outerHTML = "";
        }
        // If the only thing in the paragraph is a "br" tag, remove the paragraph
        else if (element.children.length === 1 && element.children[0].tagName === "BR") {
            // make sure this does not have text besides the br tag
            const innerHtml = element.innerHTML.toLowerCase();
            if (innerHtml === "<br>" || innerHtml === "<br/>" || innerHtml === "<br />" || innerHtml === "<br></br>") {
                element.outerHTML = "";
            }
        }
    }
}

function removeClasses(element, classes) {
    element.classList.remove(...classes);
    if (element.classList.length === 0) {
        element.removeAttribute("class");
    }
}

function removeBlockClasses(element) {
    let classes = element.classList;
    for (let c of classes) {
        if (c.startsWith("block_")) {
            element.classList.remove(c);
        }
    }
    if (element.classList.length === 0) {
        element.removeAttribute("class");
    }
}

function removeClassesThatStartWith(element, prefix) {
    let classes = element.classList;
    for (let c of classes) {
        if (c.startsWith(prefix)) {
            element.classList.remove(c);
        }
    }
    if (element.classList.length === 0) {
        element.removeAttribute("class");
    }
}

function removeIdsThatStartWith(element, prefix) {
    if (element.id?.startsWith(prefix)) {
        element.removeAttribute("id");
    }
}

function removeComments(root) {
    if (!(root instanceof Node)) {
        console.error("The root parameter is not a valid Node. Cannot remove comments.");
        return;
    }
    let walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

    // if we delete currentNode, call to nextNode() fails.
    let nodeList = [];
    while (walker.nextNode()) {
        nodeList.push(walker.currentNode);
    }
    removeElements(nodeList);
}

function moveChildElements(from, to) {
    while (from.hasChildNodes()) {
        let node = from.childNodes[0];
        to.appendChild(node);
    }
}

function copyAttributes(from, to) {
    for (let i = 0; i < from.attributes.length; ++i) {
        let attr = from.attributes[i];
        try {
            to.setAttribute(attr.localName, attr.value);
        } catch (e) {
            // probably invalid attribute name.  Discard
        }
    }
}

function replaceTag(element, replacement) {
    let parent = element.parentElement;
    parent.insertBefore(replacement, element);
    moveChildElements(element, replacement);
    copyAttributes(element, replacement);
    element.remove();
}

function removeAttributes (element, attributeNames) {
    // This would be more concise but less performant on huge DOMs
    // attributeNames.forEach(name => element.removeAttribute(name));
    if (!element || attributeNames == null) return;

    // Handle single attribute name as string
    if (typeof attributeNames === "string") {
        element.removeAttribute(attributeNames);
        return;
    }

    // Handle array of attribute names
    if (Array.isArray(attributeNames)) {
        for (const name of attributeNames) {
            if (typeof name === "string") {
                element.removeAttribute(name);
            }
        }
    }
}

function removeEmptyAttributes(content) {
    // This would be more concise but less performant on huge DOMs
    // element.getAttributeNames().forEach(attr => {
    //     if (element.getAttribute(attr).trim() === "") {
    //         element.removeAttribute(attr);
    //     }
    // });
    const elements = content.querySelectorAll("*");

    for (const element of elements) {
        const attributes = element.attributes;
        const attributesToRemove = [];

        for (let i = 0; i < attributes.length; i++) {
            if (attributes[i].value.trim() === "") {
                attributesToRemove.push(attributes[i].name);
            }
        }

        for (let i = attributesToRemove.length - 1; i >= 0; i--) {
            element.removeAttribute(attributesToRemove[i]);
        }
    }
}

function removeSpansWithNoAttributes(content) {
    // within p or div tags, spans with no attributes have no purpose
    const spans = content.querySelectorAll("p span, div span");

    for (const span of spans) {
        if (span.attributes.length === 0) {
            while (span.firstChild) {
                span.parentNode.insertBefore(span.firstChild, span);
            }
            span.parentNode.removeChild(span);
        }
    }
}

function wrapInnerContentInTag(element, tagName) {
    const wrapper = document.createElement(tagName);
    while (element.firstChild) {
        wrapper.appendChild(element.firstChild);
    }
    element.appendChild(wrapper);
}

function replaceSemanticInlineStylesWithTags(element, removeLeftoverStyles = false) {
    if (element.hasAttribute("style")) {
        let styleText = element.getAttribute("style");

        // Map of style patterns to their semantic HTML equivalents
        const styleToTag = [
            { regex: /font-style\s*:\s*(italic|oblique)\s*;/g, tag: "i" },
            { regex: /font-weight\s*:\s*(bold|[7-9]\d\d)\s*;/g, tag: "b" },
            { regex: /text-decoration\s*:\s*underline\s*;/g, tag: "u" },
            { regex: /text-decoration\s*:\s*line-through\s*;/g, tag: "s" }
        ];

        // Apply semantic tags and remove corresponding styles
        for (const style of styleToTag) {
            if (style.regex.test(styleText)) {
                // Reset lastIndex since test() advances it
                style.regex.lastIndex = 0;
                wrapInnerContentInTag(element, style.tag);
                styleText = styleText.replace(style.regex, "");
            }
        }

        // Remove non-semantic font-weight
        styleText = styleText.replace(/font-weight\s*:\s*(normal|[1-4]\d\d)\s*;/g, "");
        styleText = styleText.trim();

        if (styleText && (!removeLeftoverStyles || /italic|bold|font-weight|underline|line-through/.test(styleText))) {
            element.setAttribute("style", styleText);
        } else {
            // Remove all remaining styles except text-align:center if present
            element.style.getPropertyValue("text-align") === "center"
                ? element.setAttribute("style", "text-align: center;")
                : element.removeAttribute("style");
        }
    }
}

function aggressiveCleanupElement(element) {
    const ids = [
        "chapter-comments",
        "novel_nav",
        "donation-msg"
    ];
    const elementsWithClass = [
        "chapternav",
        "confuse",
        "code-block",
        "clearfix",
        "ezoic-autoinsert-ad",
        "floating-audio-button-container",
        "floating-reader-button-container",
        "mycred-buy-link",
        "sharedaddy",
        "wp-block-buttons",
        "jp-relatedposts",
        "grecaptcha-badge",
        "sidebar-container",
        "sidebar-nav",
        "sidebar-wrapper",
        "uwp_widget_author_box",
        "wp-image-16312",
        "wp-block-comments"
    ]
    const elementsWithAttribute = [
        "data-ez-ph-id"
    ]
    const attributes = [
        "aria-disabled",
        // "class" helps figure out what else to remove!
        "dir",
        // "id" affects footnotes and also what else to remove!
        "data-shortcode",
        "data-paragraph-id",
        "data-paragraph-index",
        "face",
        "role"
    ];
    removeElementWithIds(element, ids);
    removeElementWithClasses(element, elementsWithClass);
    removeElementWithAttributes(element, elementsWithAttribute);
    replaceSemanticInlineStylesWithTags(element, true);
    removeAttributes(element, attributes);
    removeEmptyAttributes(element);
    removeFontTags(element);
}

function cleanupContent(content) {
    const tags = [
        "BASE",
        "BREAK",
        "BUTTON",
        "DIALOG",
        "FOOTER",
        "FORM",
        "HEADER",
        "INPUT",
        "INS",
        "IFRAME",
        "LINK",
        "META",
        "NAV",
        "NOSCRIPT",
        "NEXT-ROUTE-ANNOUNCER",
        "PATH",
        "SELECT",
        "SCRIPT",
        "STYLE",
        "SVG",
        "TEXTAREA",
        "TITLE"
    ];
    removeTagsFromContent(content, tags);
    removeComments(content);
    removeEmptyAttributes(content);
    removeSpansWithNoAttributes(content);
}

function cipherSubstitution(element, cipher, alphab = null) {
    if (!alphab) {
        alphab = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
    }
    let sArray = element.textContent.split("");
    for (let i = 0; i < sArray.length; i++) {
        let index = alphab.indexOf(sArray[i]);
        if (index !== -1) {
            sArray[i] = cipher[index];
        }
    }
    element.textContent = sArray.join("");
}

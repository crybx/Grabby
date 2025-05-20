
const utils = (function() {
    function ensureHeading(content, title) {
        if (!content.querySelector('h1, h2, h3, h4, h5, h6')) {
            const firstP = content.querySelector("p");

            if (firstP && /chapter|episode|#/i.test(firstP.textContent || "")) {
                // convert first paragraph to heading
                const h1 = document.createElement("h1");
                replaceTag(firstP, h1);
            } else if (title && title.trim()) {
                console.log("I SEE NO HEADER and no chapter/episode numbering in this p:");
                console.log(firstP.textContent);
                // add h1 with title
                const h1 = document.createElement("h1");
                h1.textContent = title;
                content.insertBefore(h1, content.firstChild);
            }
        }
    }

    function trimWhitespace(element) {
        // TODO: fix this removing <b> and other tags within <p>
        // trim whitespace from the beginning and end of the text if tag is p
        if (element.tagName === "P") {
            element.textContent = element.textContent.trim();
        }
    }

    function removeTag(element, tagName) {
        if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
            element.remove();
        }
    }

    function removeTags(element, tagNames) {
        // Something is a little off about the name of this method for what it does
        // TODO: handle if tagNames is not an array and make it case insensitive
        if (tagNames.includes(element.tagName)) {
            element.remove();
        }
    }

    function removeTagsFromContent(content, tagNames) {
        // TODO: handle if tagNames is not an array
        for (let tagName of tagNames) {
            let elements = content?.querySelectorAll(tagName);
            if (elements?.length > 0) {
                removeElements(elements);
            }
        }
    }

    // TODO: handle if elements is not an array

    function removeElements(elements) {
        for (let e of elements) {
            e.remove();
        }
    }

    function removeElementWithClasses(element, classNames) {
        // TODO: handle if classNames is not an array
        for (let className of classNames) {
            if (element.classList.contains(className)) {
                element.remove();
            }
        }
    }

    function removeElementWithAttributes(element, attributes) {
        // TODO: handle if attributes is not an array
        for (let attribute of attributes) {
            if (element.hasAttribute(attribute)) {
                element.remove();
            }
        }
    }

    function removeElementWithIds(element, ids) {
        // TODO: handle if ids is not an array
        for (let id of ids) {
            if (element.id === id) {
                element.remove();
            }
        }
    }

    // TODO: replace any use of this with unwrapSpansWithNoAttributes
    function removeSpansInsideParagraph(element) {
        if (element.tagName === "P") {
            element.querySelectorAll("span").forEach(span => {
                span.outerHTML = span.innerHTML;
            });
        }
    }

    function removeEmptyParagraphAndHeadings(element) {
        const tagsToCheck = ["P", "H1", "H2", "H3", "H4", "H5", "H6"];
        if (tagsToCheck.includes(element.tagName) && element.textContent.trim() === "") {
            if (element.children.length === 0) {
                element.remove();
            }
            // If the only thing inside is a "br" tag, remove it
            else if (element.children.length === 1 && element.children[0].tagName === "BR") {
                element.remove();
            }
        }
    }

    function removeClasses(element, classes) {
        element.classList.remove(...classes);
        if (element.classList.length === 0) {
            removeAttributes(element, "class");
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
            removeAttributes(element, "class");
        }
    }

    function removeIdsThatStartWith(element, prefix) {
        if (element.id?.startsWith(prefix)) {
            removeAttributes(element, "id");
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

    function copyAttributes(from, to) {
        for (let i = 0; i < from.attributes.length; ++i) {
            let attr = from.attributes[i];
            try {
                to.setAttribute(attr.localName, attr.value);
            } catch (e) {
                // probably invalid attribute name, discard
            }
        }
    }

    function removeAttributes(element, attributeNames) {
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

    function removeEmptyDivElements(element) {
        removeElements(getElements(element, "div", e => isElementWhiteSpace(e)));
    }

    function getElements(dom, tagName, filter) {
        let array = Array.from(dom.getElementsByTagName(tagName));
        return (filter === undefined || typeof filter !== 'function')
            ? array : array.filter(filter);
    }

    function isElementWhiteSpace(element) {
        switch (element.nodeType) {
            case Node.TEXT_NODE:
                return isStringWhiteSpace(element.textContent);
            case Node.COMMENT_NODE:
                return true;
        }
        if ((element.tagName === "IMG") || (element.tagName === "image")) {
            return false;
        }
        if (element.querySelector("img, image") !== null) {
            return false;
        }
        return isStringWhiteSpace(element.innerText);
    }

    function isStringWhiteSpace(s) {
        return !(/\S/.test(s));
    }

    function unwrapSpansWithNoAttributes(content) {
        // within p or div tags, spans with no attributes have no purpose
        const spans = content.querySelectorAll("p span, div span");

        for (const span of spans) {
            if (span.attributes.length === 0) {
                unwrapTag(span);
            }
        }
    }

    function moveChildElements(from, to) {
        while (from.firstChild) {
            to.appendChild(from.firstChild);
        }
    }

    function replaceTag(element, replacement) {
        const parent = element.parentElement;
        parent.insertBefore(replacement, element);
        moveChildElements(element, replacement);
        copyAttributes(element, replacement);
        element.remove();
    }

    function unwrapAllOfTag(content, tagName) {
        const elements = content?.querySelectorAll(tagName) || [];
        for (const element of elements) {
            unwrapTag(element);
        }
    }

    function unwrapTag(element) {
        while (element.firstChild) {
            element.parentNode.insertBefore(element.firstChild, element);
        }
        element.parentNode.removeChild(element);
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
                { regex: /font-style\s*:\s*(italic|oblique)\s*;?/g, tag: "i" },
                { regex: /font-weight\s*:\s*(bold|[7-9]\d\d)\s*;?/g, tag: "b" },
                { regex: /text-decoration\s*:\s*underline\s*;?/g, tag: "u" },
                { regex: /text-decoration\s*:\s*line-through\s*;?/g, tag: "s" }
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
            styleText = styleText.replace(/font-weight\s*:\s*(normal|[1-4]\d\d)\s*;?/g, "");
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

    function standardElementCleanup(element) {
        const ids = [
            "chapter-comments",
            "novel_nav",
            "donation-msg"
        ];
        const elementsWithClass = [
            "adsbygoogle",
            "chapternav",
            "confuse",
            "code-block",
            "clearfix",
            "ezoic-autoinsert-ad",
            "floating-audio-button-container",
            "floating-reader-button-container",
            "grecaptcha-badge",
            "jp-relatedposts",
            "mycred-buy-link",
            "sharedaddy",
            "sidebar-container",
            "sidebar-nav",
            "sidebar-wrapper",
            "uwp_widget_author_box",
            "wp-image-16312",
            "wp-block-buttons",
            "wp-block-comments"
        ]
        const elementsWithAttribute = [
            "data-ez-ph-id"
        ]

        // Don't remove:
        // "class" story relevant styles and helps figure out what to remove/target
        // "id" affects footnotes and helps figure out what to remove/target
        const attributes = [
            "aria-disabled",
            "dir",
            "data-shortcode",
            "data-paragraph-id",
            "data-paragraph-index",
            "face",
            "role"
        ];
        removeElementWithIds(element, ids);
        removeElementWithClasses(element, elementsWithClass);
        removeElementWithAttributes(element, elementsWithAttribute);
        replaceSemanticInlineStylesWithTags(element, false);
        removeAttributes(element, attributes);
        removeEmptyAttributes(element);
    }

    function standardContentCleanup(content) {
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
        unwrapAllOfTag(content, "font");
        removeComments(content);
        removeEmptyAttributes(content);
        unwrapSpansWithNoAttributes(content);
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

    // Return the public API
    return {
        ensureHeading: ensureHeading,
        trimWhitespace: trimWhitespace,
        removeTag: removeTag,
        removeTags: removeTags,
        removeTagsFromContent: removeTagsFromContent,
        removeElements: removeElements,
        removeElementWithClasses: removeElementWithClasses,
        removeElementWithAttributes: removeElementWithAttributes,
        removeElementWithIds: removeElementWithIds,
        removeSpansInsideParagraph: removeSpansInsideParagraph,
        removeEmptyParagraphAndHeadings: removeEmptyParagraphAndHeadings,
        removeClasses: removeClasses,
        removeClassesThatStartWith: removeClassesThatStartWith,
        removeIdsThatStartWith: removeIdsThatStartWith,
        removeComments: removeComments,
        copyAttributes: copyAttributes,
        removeAttributes: removeAttributes,
        removeEmptyAttributes: removeEmptyAttributes,
        removeEmptyDivElements: removeEmptyDivElements,
        getElements: getElements,
        isElementWhiteSpace: isElementWhiteSpace,
        isStringWhiteSpace: isStringWhiteSpace,
        unwrapSpansWithNoAttributes: unwrapSpansWithNoAttributes,
        moveChildElements: moveChildElements,
        replaceTag: replaceTag,
        unwrapAllOfTag: unwrapAllOfTag,
        unwrapTag: unwrapTag,
        wrapInnerContentInTag: wrapInnerContentInTag,
        replaceSemanticInlineStylesWithTags: replaceSemanticInlineStylesWithTags,
        standardElementCleanup: standardElementCleanup,
        standardContentCleanup: standardContentCleanup,
        cipherSubstitution: cipherSubstitution
    };
})();

// Create an alias so both 'utils' and 'util' can be used
const util = utils;
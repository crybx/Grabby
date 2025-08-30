
const utils = (function() {
    function ensureHeading(content, title) {
        if (!content.querySelector("h1, h2, h3, h4, h5, h6")) {
            const firstP = content.querySelector("p");

            if (firstP && /chapter|episode|#/i.test(firstP.textContent || "")) {
                // convert first paragraph to heading
                const h1 = document.createElement("h1");
                replaceTag(firstP, h1);
            } else if (title && title.trim()) {
                // add h1 with title
                const h1 = document.createElement("h1");
                h1.textContent = title;
                content.insertBefore(h1, content.firstChild);
            }
        }
    }

    function trimWhitespace(element) {
        // Only process paragraph elements
        if (element.tagName === "P") {
            // Check if the element has any child nodes
            if (element.childNodes.length > 0) {
                // Trim leading whitespace
                let firstNode = element.childNodes[0];
                if (firstNode.nodeType === Node.TEXT_NODE && firstNode.nodeValue.trim() === "") {
                    // If it's an empty text node, remove it
                    firstNode.remove();
                } else if (firstNode.nodeType === Node.TEXT_NODE) {
                    // If it's a text node with content, trim the leading whitespace
                    firstNode.nodeValue = firstNode.nodeValue.replace(/^\s+/, "");
                }

                // Trim trailing whitespace
                let lastNode = element.childNodes[element.childNodes.length - 1];
                if (lastNode.nodeType === Node.TEXT_NODE && lastNode.nodeValue.trim() === "") {
                    // If it's an empty text node, remove it
                    lastNode.remove();
                } else if (lastNode.nodeType === Node.TEXT_NODE) {
                    // If it's a text node with content, trim the trailing whitespace
                    lastNode.nodeValue = lastNode.nodeValue.replace(/\s+$/, "");
                }
            } else {
                // If there are no child nodes, just use the simple approach
                element.textContent = element.textContent.trim();
            }
        }
    }

    function removeTag(element, tagName) {
        if (element.tagName.toLowerCase() === tagName.toLowerCase()) {
            element.remove();
        }
    }

    function removeTags(element, tagNames) {
        // Handle if tagNames is not an array
        const tagNamesArray = Array.isArray(tagNames) ? tagNames : [tagNames];

        // Make comparison case-insensitive by converting element's tag name to uppercase
        // and ensuring all tagNames are uppercase for comparison
        const elementTagUpper = element.tagName.toUpperCase();

        // Check if the element's tag (case-insensitive) is in the tagNames array
        if (tagNamesArray.some(tag => tag.toUpperCase() === elementTagUpper)) {
            element.remove();
        }
    }

    function removeTagsFromContent(content, tagNames) {
        // Convert single tagName to array for consistent handling
        const tagNamesArray = Array.isArray(tagNames) ? tagNames : [tagNames];

        for (let tagName of tagNamesArray) {
            let elements = content?.querySelectorAll(tagName);
            if (elements?.length > 0) {
                removeElements(elements);
            }
        }
    }

    function removeElements(elements) {
        // Handle if elements is not an array or NodeList
        if (!elements) {
            return; // Handle null/undefined case
        }

        // If it's a single element (not iterable)
        if (elements.nodeType || !elements[Symbol.iterator]) {
            elements.remove();
            return;
        }

        // Handle array, NodeList, or other iterable collections
        for (let e of elements) {
            e.remove();
        }
    }

    function removeElementWithClasses(element, classNames) {
        // Convert single string to array for consistent handling
        const classNamesArray = Array.isArray(classNames) ? classNames : [classNames];

        for (let className of classNamesArray) {
            if (element.classList.contains(className)) {
                element.remove();
                break; // Once element is removed, no need to check other classes
            }
        }
    }

    function removeElementWithAttributes(element, attributes) {
        // Convert single attribute to array for consistent handling
        const attributesArray = Array.isArray(attributes) ? attributes : [attributes];

        for (let attribute of attributesArray) {
            if (element.hasAttribute(attribute)) {
                element.remove();
                break; // Once element is removed, no need to check other attributes
            }
        }
    }

    function removeElementWithIds(element, ids) {
        // Convert single id to array for consistent handling
        const idsArray = Array.isArray(ids) ? ids : [ids];

        for (let id of idsArray) {
            if (element.id === id) {
                element.remove();
                break; // Once element is removed, no need to check other ids
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

    function removeClassesThatStartWith(element, prefixes) {
        // Convert single string to array for consistent handling
        const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];

        // Get all classes
        let classes = element.classList;
        let classesToRemove = [];

        // First collect all classes to remove
        for (let c of classes) {
            for (let prefix of prefixArray) {
                if (c.startsWith(prefix)) {
                    classesToRemove.push(c);
                    break; // No need to check other prefixes for this class
                }
            }
        }

        // Then remove them
        for (let classToRemove of classesToRemove) {
            element.classList.remove(classToRemove);
        }

        // Remove the class attribute if no classes remain
        if (element.classList.length === 0) {
            removeAttributes(element, "class");
        }
    }

    function removeIdsThatStartWith(element, prefixes) {
        // Convert single string to array for consistent handling
        const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];

        // Check if element has an id and if it starts with any of the prefixes
        if (element.id) {
            for (let prefix of prefixArray) {
                if (element.id.startsWith(prefix)) {
                    removeAttributes(element, "id");
                    break; // No need to check other prefixes once id is removed
                }
            }
        }
    }

    function removeAttributesThatStartWith(element, prefixes) {
        // Convert single string to array for consistent handling
        const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];

        // Get all attributes
        const attributes = element.attributes;
        const attributesToRemove = [];

        // First collect all attributes to remove
        for (let i = 0; i < attributes.length; i++) {
            const attr = attributes[i];
            for (let prefix of prefixArray) {
                if (attr.name.startsWith(prefix)) {
                    attributesToRemove.push(attr.name);
                    break; // No need to check other prefixes for this attribute
                }
            }
        }

        // Then remove them
        for (let attrName of attributesToRemove) {
            element.removeAttribute(attrName);
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
        return (filter === undefined || typeof filter !== "function")
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

    function removeElementWithClassesThatStartWith(element, prefixes) {
        // Convert single string to array for consistent handling
        const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];

        // Check if element has classes
        if (element.classList && element.classList.length > 0) {
            // Check each class against each prefix
            for (let prefix of prefixArray) {
                for (let className of element.classList) {
                    if (className.startsWith(prefix)) {
                        element.remove();
                        return; // Once element is removed, no need to continue
                    }
                }
            }
        }
    }

    function removeElementWithIdsThatStartWith(element, prefixes) {
        // Convert single string to array for consistent handling
        const prefixArray = Array.isArray(prefixes) ? prefixes : [prefixes];

        // Check if element has an id
        if (element.id) {
            // Check if the id starts with any of the prefixes
            for (let prefix of prefixArray) {
                if (element.id.startsWith(prefix)) {
                    element.remove();
                    return; // Once element is removed, no need to continue
                }
            }
        }
    }

    function wrapRawTextInPTags(dom) {
        // wrap raw text in p tags
        // Find text nodes that are direct children of the content div
        const textNodes = [];
        const walker = dom.ownerDocument.createTreeWalker(
            dom,
            NodeFilter.SHOW_TEXT,
            { acceptNode: node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== "" ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
        );

        while (walker.nextNode()) {
            const node = walker.currentNode;
            // Only process text nodes that are direct children of the content div
            if (node.parentNode === dom) {
                textNodes.push(node);
            }
        }

        // Replace each text node with a paragraph
        textNodes.forEach(node => {
            const text = node.nodeValue.trim();
            if (text) {
                const p = dom.ownerDocument.createElement("p");
                p.textContent = text;
                node.parentNode.replaceChild(p, node);
            }
        });
    }

    function standardElementCleanup(element) {
        const ids = [
            "chapter-comments",
            "donation-msg",
            "grabby-button",
            "novel_nav"
        ];
        const idPrefixes = [
            "google-ads"
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
        ];
        const elementsWithAttribute = [
            "data-ez-ph-id"
        ];

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
        removeElementWithIdsThatStartWith(element, idPrefixes);
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
        wrapRawTextInPTags(content); // do after unwrapping spans in case we created raw text
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
        removeElementWithClassesThatStartWith: removeElementWithClassesThatStartWith,
        removeElementWithAttributes: removeElementWithAttributes,
        removeElementWithIds: removeElementWithIds,
        removeElementWithIdsThatStartWith: removeElementWithIdsThatStartWith,
        removeSpansInsideParagraph: removeSpansInsideParagraph,
        removeEmptyParagraphAndHeadings: removeEmptyParagraphAndHeadings,
        removeAttributesThatStartWith: removeAttributesThatStartWith,
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
        wrapRawTextInPTags: wrapRawTextInPTags,
        replaceSemanticInlineStylesWithTags: replaceSemanticInlineStylesWithTags,
        standardElementCleanup: standardElementCleanup,
        standardContentCleanup: standardContentCleanup,
        cipherSubstitution: cipherSubstitution
    };
})();
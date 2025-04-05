function removeTag(element, tagName) {
    if (element.tagName === tagName) {
        //element.outerHTML = '';
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
    let fontTag = element.querySelector('font');
    if (!fontTag) { return; }

    let innerHTML = fontTag.innerHTML;
    // if the first child of the 'font' tag is also a 'font' tag, get the innerHTML of the second 'font' tag
    if (fontTag.children.length > 0 && fontTag.children[0].tagName === 'FONT') {
        innerHTML = fontTag.children[0].innerHTML;
    }
    fontTag.outerHTML = innerHTML;
}

function removeSpansInsideParagraph(element) {
    if (element.tagName === 'P') {
        element.querySelectorAll('span').forEach(span => {
            span.outerHTML = span.innerHTML;
        });
    }
}

function removeEmptyParagraphAndHeadings(element) {
    const tagsToCheck = ['P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6'];
    if (tagsToCheck.includes(element.tagName)) {
        if (element.children.length === 0 && element.textContent.trim() === '') {
            element.outerHTML = '';
        }
        // If the only thing in the paragraph is a 'br' tag, remove the paragraph
        else if (element.children.length === 1 && element.children[0].tagName === 'BR') {
            // make sure this doesn't have text besides the br tag
            const innerHtml = element.innerHTML.toLowerCase();
            if (innerHtml === '<br>' || innerHtml === '<br/>' || innerHtml === '<br />' || innerHtml === '<br></br>') {
                element.outerHTML = '';
            }
        }
    }
}

function removeClasses(element, classes) {
    element.classList.remove(...classes);
    if (element.classList.length === 0) {
        element.removeAttribute('class');
    }
}

function removeBlockClasses(element) {
    let classes = element.classList;
    for (let c of classes) {
        if (c.startsWith('block_')) {
            element.classList.remove(c);
        }
    }
    if (element.classList.length === 0) {
        element.removeAttribute('class');
    }
}

function removeAttributes(element, attributeName) {
    for (let name of attributeName) {
        element.removeAttribute(name);
    }
}

function removeComments (root) {
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

function aggressiveCleanupElement(element) {
    const ids = [
        'novel_nav',
        'donation-msg'
    ];
    const elementsWithClass = [
        'confuse',
        'code-block',
        'clearfix',
        'ezoic-autoinsert-ad',
        'floating-audio-button-container',
        'floating-reader-button-container',
        'mycred-buy-link',
        'sharedaddy',
        'wp-block-buttons',
        'jp-relatedposts',
        'grecaptcha-badge',
        'sidebar-container',
        'sidebar-nav',
        'wp-image-16312'
    ]
    const elementsWithAttribute = [
        'data-ez-ph-id'
    ]
    const attributes = [
        'aria-disabled',
        // 'class' helps figure out what else to remove!
        'dir',
        // 'id' affects footnotes and also what else to remove!
        'data-shortcode',
        'data-paragraph-id',
        'data-paragraph-index',
        'face',
        'style',
        'role'
    ];
    removeElementWithIds(element, ids);
    removeElementWithClasses(element, elementsWithClass);
    removeElementWithAttributes(element, elementsWithAttribute);
    removeAttributes(element, attributes);
    removeFontTags(element);
}

function aggressiveCleanupContent(content) {
    const tags = [
        'BASE',
        'BREAK',
        'BUTTON',
        'FOOTER',
        'HEADER',
        'INS',
        'IFRAME',
        'LINK',
        'META',
        'NAV',
        'NOSCRIPT',
        'NEXT-ROUTE-ANNOUNCER',
        'PATH',
        'SELECT',
        'SCRIPT',
        'STYLE',
        'SVG',
        'TEXTAREA',
        'TITLE'
    ];
    removeTagsFromContent(content, tags);
    removeComments(content);
}

function dejumble(node, cipher) {
    // Get cipher by copying abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
    // into an element that has the scrambled text on the page.
    const alphab = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let sArray = node.textContent.split("");
    for (let i = 0; i < sArray.length; i++) {
        let index = alphab.indexOf(sArray[i]);
        if (index !== -1) {
            sArray[i] = cipher[index];
        }
    }
    node.textContent = sArray.join("");
}

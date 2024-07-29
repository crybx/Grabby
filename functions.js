function copyToClipboard(text) {
    console.log(text);

    // Create a textbox field where we can insert text to.
    let copyFrom = document.createElement("textarea");

    // Set the text content to be the text you wished to copy.
    copyFrom.textContent = text;

    // Append the textbox field into the body as a child.
    // "execCommand()" only works when there exists selected text, and the text is inside
    // document.body (meaning the text is part of a valid rendered HTML element).
    document.body.appendChild(copyFrom);

    // Select all the text!
    copyFrom.select();

    // Execute command
    document.execCommand('copy');

    // (Optional) De-select the text using blur().
    copyFrom.blur();

    // Remove the textbox field from the document.body, so no other JavaScript nor
    // other elements can get access to this.
    document.body.removeChild(copyFrom);
}

function deJum(sentence){
    let sArray = sentence.split("")
    let newSentence;
    let i;
    let alphab = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let cypher = 'tonquerzlawicvfjpsyhgdmkbxJKABRUDQZCTHFVLIWNEYPSXGOM';

    for (i = 0; i < sArray.length; i++){
        // get the index of the character in the cypher
        let index = cypher.indexOf(sArray[i]);
        // if index is -1, the character is not in the cypher
        if (index !== -1){
            // replace the character with the corresponding character in the alphab
            sArray[i] = alphab[index];
        }
    }
    newSentence = sArray.join("");
    return newSentence;
}

function removeElements(elements) {
    for (let e of elements) {
        e.remove();
    }
}

function removeTag(element, tagName) {
    if (element.tagName === tagName) {
        //element.outerHTML = '';
        element.remove();
    }
}

function oldRemoveFontTags(element) {
    let innerHTML = element.innerHTML;

    if (element.children.length > 0 && element.children[0].tagName === 'FONT') {
        innerHTML = element.children[0].innerHTML;
        if (element.children[0].children.length > 0 && element.children[0].children[0].tagName === 'FONT') {
            innerHTML = element.children[0].children[0].innerHTML
        }
    }

    if (element.tagName === 'FONT') {
        if (element.parentElement) {
            element.outerHTML = innerHTML;
        } else {
            element.innerHTML = innerHTML;
        }
    } else if (element.tagName === 'P') {
        element.innerHTML = innerHTML;
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

function removeEmptyParagraphAndHeadings(element) {
    if (element.tagName === 'P'
        || element.tagName === 'H1'
        || element.tagName === 'H2'
        || element.tagName === 'H3'
        || element.tagName === 'H4'
        || element.tagName === 'H5'
        || element.tagName === 'H6') {
        if (element.textContent.trim() === '') {
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
    // element.classList.remove('block_1');
    // element.classList.remove('body');
    element.classList.remove(...classes);
    if (element.classList.length === 0) {
        element.removeAttribute('class');
    }
}

function removeComments (root) {
    let walker = document.createTreeWalker(root, NodeFilter.SHOW_COMMENT);

    // if we delete currentNode, call to nextNode() fails.
    let nodeList = [];
    while (walker.nextNode()) {
        nodeList.push(walker.currentNode);
    }
    removeElements(nodeList);
}

function grabKakaoPage() {
    const shadowHost = document.querySelector('#__next > div > div.flex > div > div > div.mx-auto > div.h-full > div > div');
    const shadowRoot = shadowHost.shadowRoot;
    const content = shadowRoot.querySelector('.DC2CN');
    content.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        // remove all attributes from 'p' tag elements
        if (element.tagName === 'P') {
            element.removeAttribute('id');
            element.removeAttribute('data-p-id');
            element.removeAttribute('data-original-font-size');
            element.removeAttribute('data-original-line-height');
            element.removeAttribute('style');
        }
    });
    copyToClipboard(content.innerHTML);
}

function grabRidi() {
    let fullText = '';

    // Ridi can have multiple articles in one page
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
        removeComments(article);
        article.querySelectorAll('*').forEach(element => {
            removeFontTags(element);
            removeTag(element, 'PRE');
            removeTag(element, 'TITLE');
            removeTag(element, 'LINK');
            removeClasses(element, ['block_1', 'body', 'story_part_header_title']);
            element.removeAttribute('style');
            removeEmptyParagraphAndHeadings(element);
        });
        fullText += article.innerHTML;
    });

    copyToClipboard(fullText);
}

function grabPublang() {
    const iframe = document.querySelector('iframe');
    const srcdoc = iframe.getAttribute('srcdoc');

    let temp = document.createElement('div');
    temp.innerHTML = srcdoc;
    temp.querySelectorAll('*').forEach(element => {
        removeTag(element, 'LINK');
        removeTag(element, 'BASE');
        removeTag(element, 'META');

        if (element.tagName === 'TITLE') {
            element.outerHTML = '<h1>' + element.innerHTML + '</h1>';
        } else if (element.tagName === 'STYLE') {
            // let style = '';
            // style += element.outerHTML;
            // element.outerHTML = '';
            // console.log(style);
        }
    });

    copyToClipboard(temp.innerHTML);
}

function grabSyosetu() {
    const title = document.querySelector('.novel_subtitle').textContent;
    const chapter = document.querySelector('#novel_honbun');

    chapter.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        if (element.tagName === 'P') {
            element.removeAttribute('id');
            element.textContent = element.textContent.trim();
        }
    });

    let fullText = '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
    copyToClipboard(fullText);
}

function grabJoara() {
    const chapter = document.querySelector('.text-wrap');
    chapter.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        if (element.tagName === 'P') {
            element.textContent = element.textContent.trim();
        } else if (element.tagName === 'SMALL') {
            element.outerHTML = '';
        }
    });
    copyToClipboard(chapter.innerHTML);
}

function grabChrysanthemum() {
    const title = document.querySelector('.entry-title').querySelector('.chapter-title').textContent;
    const chapter = document.querySelector('#novel-content');

    chapter.querySelectorAll('*').forEach(element => {
        if (element.tagName === 'DIV') {
            if (element.classList.contains('chrys-iklan')) {
                element.outerHTML = '';
            }
        } else {
            const elementStyle = element.getAttribute('style');
            if (elementStyle?.includes('height:1px')) {
                element.outerHTML = '';
            }
        }

        // if element has class "jum" call deJum function
        if (element.classList.contains('jum')) {
            element.innerHTML = deJum(element.innerHTML);
            // remove jum class
            element.classList.remove('jum');
        }
    });

    let fullText = '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
    copyToClipboard(fullText);
}

function grabGoogleDocMobileBasic() {
    const content = document.querySelector('.doc-content');

    content.querySelectorAll('*').forEach(element => {
        element.removeAttribute('style');
        // if element contains 'table of contents', remove the element
        if (element.textContent.toLowerCase().includes('table of contents')) {
            element.outerHTML = '';
        }
        // if element contains 'docs.google.com', remove the element
        else if (element.textContent.toLowerCase().includes('docs.google.com')) {
            element.outerHTML = '';
        }
        else if (element.tagName === 'SPAN' || element.tagName === 'A') {
            // remove 'span' and 'a' tag elements while keeping the inner text
            element.outerHTML = element.innerHTML;
        }

    });

    copyToClipboard(content.innerHTML);
}

function grabBlogspot() {
    const title = document.querySelector('.entry-title').textContent;
    const content = document.querySelector('.entry-content');

    // remove all elements that appear after the text 'Next Chapter' shows up
    let nextChapter = false;

    content.querySelectorAll('*').forEach(element => {
        // remove the attribute 'face'
        element.removeAttribute('face');
        if (element.textContent.toLowerCase().includes('next chapter')) {
            nextChapter = true;
        }
        if (nextChapter) {
            element.outerHTML = '';
        }
    });

    let fullText = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    copyToClipboard(fullText);
}

function madaraWpTheme() {
    const title = document.querySelector('#chapter-heading').textContent;
    const content = document.querySelector('.text-left');

    content.querySelectorAll('*').forEach(element => {
        // remove span inside p
        if (element.tagName === 'P') {
            element.querySelectorAll('span').forEach(span => {
                span.outerHTML = span.innerHTML;
            });
        } else if (element.tagName === 'SCRIPT'
                || element.tagName === 'INS'
                || element.tagName === 'DIV') {
            element.outerHTML = '';
        }
    });

    let fullText = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    copyToClipboard(fullText);
}

function grabWatashiWaSugoiDesu() {
    const content = document.querySelector('#wtr-content');

    content.querySelectorAll('*').forEach(element => {
        element.removeAttribute('class');
        element.removeAttribute('style');
        if (element.tagName === 'SELECT') {
            element.outerHTML = '';
        }
    });

    copyToClipboard(content.innerHTML);
}

function grabWordpress() {
    const title = document.querySelector('title').textContent;
    const content = document.querySelector('.entry-content');

    // Remove script elements
    content.querySelectorAll('script').forEach(script => {
        script.outerHTML = '';
    });

    let fullText = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    copyToClipboard(fullText);
}

function grabJjwxc() {
    const title = document.querySelector('.noveltitle').textContent;
    const content = document.querySelector('.novelbody');

    content.querySelectorAll('*').forEach(element => {
        // remove style attribute from all elements
        element.removeAttribute('style');
    });

    let fullText = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    copyToClipboard(fullText);
}

function grabStorySeedling() {
    const content = document.querySelectorAll('.mb-4');
    // if element contains text 'chapter' add it to the fullText
    let fullText = '';
    content.forEach(element => {
        if (element.textContent.toLowerCase().includes('chapter')) {
            fullText += element.innerHTML;
        }
    });

    copyToClipboard(fullText);
}

function grabBlossom() {
    const title = document.querySelector('.chapter__title').textContent;
    const content = document.querySelector('.chapter-formatting');

    content.querySelectorAll('*').forEach(element => {
        // remove span inside p
        if (element.tagName === 'P') {
            element.querySelectorAll('span').forEach(span => {
                span.outerHTML = span.innerHTML;
            });
        }

        //remove id attribute
        element.removeAttribute('id');
        // remove 'data-paragraph-id' attribute
        element.removeAttribute('data-paragraph-id');
    });

    let fullText = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    copyToClipboard(fullText);
}

function grabLocalFile() {
    const content = document.documentElement;

    content.querySelectorAll('*').forEach(element => {
        removeFontTags(element);

        // trim whitespace from the beginning and end of the text if tag is p
        if (element.tagName === 'P') {
            element.textContent = element.textContent.trim();
        }
    });

    // remove link tag with href of "https://www.gstatic.com/_/translate_http/_/ss/k=translate_http.tr.26tY-h6gH9w.L.W.O/am=Ohg/d=0/rs=AN8SPfocrRO-f5jO91h2UqcrdJsFzeCmQQ/m=el_main_css"
    const extraCss = document.querySelector('link[href="https://www.gstatic.com/_/translate_http/_/ss/k=translate_http.tr.26tY-h6gH9w.L.W.O/am=Ohg/d=0/rs=AN8SPfocrRO-f5jO91h2UqcrdJsFzeCmQQ/m=el_main_css"]');
    const extraDiv = document.querySelector('#goog-gt-tt');
    extraCss.remove();
    extraDiv.remove();

    // and self-closing / to end of link tag
    const linkTags = document.querySelectorAll('link');
    linkTags.forEach(link => {
        // TDOO: this is not working, the link still doesn't self close
        link.outerHTML = link.outerHTML.replace('>', '/>');
    });

    const fullHtml = "<?xml version='1.0' encoding='utf-8'?>" + content.outerHTML;
    copyToClipboard(fullHtml);
}

function getAllLinks() {
    const links = document.querySelectorAll('a');
    let allLinks = '';
    links.forEach(link => {
        // if the link text has more than 1000 characters, skip it
        // if (link.text.length > 1000) { return; }
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, ' ');
        // if text contains 'chapter' or 'Chapter', add it to the allLinks
        if (link.text.toLowerCase().includes('chapter')) {
            allLinks += '<a href="' + link.href +'">' + link.text  + '</a>\n';
        }
        //allLinks += '<a href="' + link.href +'">' + link.text  + '</a>\n';
    });
    console.log(allLinks);
    copyToClipboard(allLinks);
}


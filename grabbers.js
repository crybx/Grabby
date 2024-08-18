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

function getHtmlFromContent(title, bodyText) {
    return `<?xml version='1.0' encoding='utf-8'?>
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
  <title>${title}</title>
  <link type="text/css" rel="stylesheet" href="../styles/stylesheet.css"/>
</head>
<body>
${bodyText}
</body>
</html>
    `;
}

function getFileBlobFromContent(title, bodyText) {
    let blobText = getHtmlFromContent(title, bodyText);
    return new Blob([blobText], {type: 'text/html'});
}

function dejumble(node) {
    const alphab = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const cypher = 'jymvfoutlpxiwcbqdgraenkzshCDJGSMXLPABOZRYUHEVKFNQWTI';
    let sArray = node.textContent.split("");
    for (let i = 0; i < sArray.length; i++) {
        let index = cypher.indexOf(sArray[i]);
        if (index !== -1) {
            sArray[i] = alphab[index];
        }
    }
    node.textContent = sArray.join("");
    node.classList.remove("jum");
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
    return content.innerHTML;
}

function grabRidi() {
    let fullText = '';

    // Ridi can have multiple articles in one page
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
        removeComments(article);
        article.querySelectorAll('*').forEach(element => {
            removeFontTags(element);
            removeTags(element, ['PRE', 'TITLE', 'LINK']);
            removeBlockClasses(element);
            removeClasses(element, ['body', 'story_part_header_title']);
            element.removeAttribute('style');
            removeEmptyParagraphAndHeadings(element);
        });
        fullText += article.innerHTML;
    });
    return fullText;
}

function grabPublang() {
    const iframe = document.querySelector('iframe');
    const srcdoc = iframe.getAttribute('srcdoc');

    let temp = document.createElement('div');
    temp.innerHTML = srcdoc;
    temp.querySelectorAll('*').forEach(element => {
        removeTags(element, ['LINK', 'BASE', 'META']);

        if (element.tagName === 'TITLE') {
            element.outerHTML = '<h1>' + element.innerHTML + '</h1>';
        }
    });
    return temp.innerHTML;
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
    return '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
}

function grabJoara() {
    const chapter = document.querySelector('.text-wrap');
    chapter.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        removeTag(element, 'SMALL')
        if (element.tagName === 'P') {
            element.textContent = element.textContent.trim();
        }
    });
    return chapter.innerHTML;
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
            dejumble(element);
        }
        if (element.classList.contains('emoji')) {
            element.remove();
        }
    });
    return '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
}

function grabGoogleDocMobileBasic() {
    const content = document.querySelector('.doc-content');
    const headings = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6'];

    content.querySelectorAll('*').forEach(element => {
        element.removeAttribute('style');
        // if element contains 'table of contents', remove the element
        if (element.textContent.toLowerCase().includes('table of contents')) {
            element.remove();
        }
        // if element contains 'docs.google.com', remove the element
        else if (element.textContent.toLowerCase().includes('docs.google.com')) {
            element.remove();
        }
        else if (element.tagName === 'SPAN' || element.tagName === 'A') {
            // remove 'span' and 'a' tag elements while keeping the inner text
            element.outerHTML = element.innerHTML;
        }
        // if element is a heading, remove the 'id' attribute
        else if (headings.includes(element.tagName)) {
            element.removeAttribute('id');
        }
    });
    return content.innerHTML;
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
            element.remove();
        }
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function madaraWpTheme() {
    const title =
        document.querySelector("ol.breadcrumb li.active")?.textContent ||
        document.querySelector('#chapter-heading')?.textContent ||
        document.querySelector('.wp-block-heading')?.textContent ||
        '';
    const content =
        document.querySelector('.text-left') ||
        document.querySelector('.entry-content_wrap');

    content.querySelectorAll('*').forEach(element => {
        removeSpansInsideParagraph(element);
        removeTags(element, ['SCRIPT', 'INS', 'DIV']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabWatashiWaSugoiDesu() {
    const content = document.querySelector('#wtr-content');

    content.querySelectorAll('*').forEach(element => {
        removeAttributes(element, ['class', 'style']);
        removeTags(element, ['SCRIPT', 'SELECT']);
        removeElementWithClasses(element, ['ezoic-autoinsert-ad']);
        removeElementWithAttributes(element, ['data-ez-ph-id']);
    });
    return content.innerHTML;
}

function grabWordpress() {
    const title = document.querySelector('title').textContent;
    const content = document.querySelector('.entry-content');

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
    });
    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabJjwxc() {
    const title = document.querySelector('.noveltitle').textContent;
    const content = document.querySelector('.novelbody');

    content.querySelectorAll('*').forEach(element => {
        element.removeAttribute('style');
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
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
    return fullText;
}

function grabBlossom() {
    const title = document.querySelector('.chapter__title').textContent;
    const content = document.querySelector('.chapter-formatting');

    content.querySelectorAll('*').forEach(element => {
        removeSpansInsideParagraph(element);
        removeAttributes(element, ['id', 'data-paragraph-id']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabPatreon() {
    const content = document.querySelector('body');

    // add all <p> and header tags to the fullText
    let fullText = '';
    content.querySelectorAll('p, h1, h2, h3, h4, h5, h6').forEach(element => {
        fullText += element.outerHTML;
    });

    return fullText;
}

function grabYoruWorld() {
    const content = document.querySelector('.__className_11742b');
    const title = document.querySelector('.text-2xl').textContent;

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabStarlightStream() {
    const content = document.querySelector('[data-id="content-viewer"]');
    const title = document.querySelector('title').textContent;

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
    });

    // get all the p tags
    let fullText = '';
    content.querySelectorAll('p').forEach(element => {
        fullText += '<p>' + element.innerHTML + '</p>';
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + fullText;
}

function grabLocalFile() {
    const content = document.querySelector('body');
    content.querySelectorAll('*').forEach(element => {
        removeFontTags(element);

        // trim whitespace from the beginning and end of the text if tag is p
        if (element.tagName === 'P') {
            element.textContent = element.textContent.trim();
        }
    });
    const extraDiv = document.querySelector('#goog-gt-tt');
    if (extraDiv) extraDiv.remove();
    return content.innerHTML;
}

function grabUnknown() {
    const content = document.querySelector('body');
    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
    });
    return content.innerHTML;
}

function getAllLinks() {
    const links = document.querySelectorAll('a');
    let allLinks = '';
    links.forEach(link => {
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, ' ');
        // if text contains 'chapter' or 'Chapter', add it to the allLinks
        if (link.text.toLowerCase().includes('chapter')) {
            allLinks += '<a href="' + link.href +'">' + link.text  + '</a>\n';
        }
        //allLinks += '<a href="' + link.href +'">' + link.text  + '</a>\n';
    });
    console.log(allLinks);
    return allLinks;
}


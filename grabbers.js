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

function getTitleFromFirstHeading(content) {
    var parser = new DOMParser();
    var doc = parser.parseFromString(content, "text/html");
    title = doc.querySelector('h1').textContent;
    return title;
}

function getFileBlobFromContent(title, bodyText) {
    let blobText = getHtmlFromContent(title, bodyText);
    return new Blob([blobText], {type: 'text/html'});
}

function grabKakaoPage() {
    const shadowHost = document.querySelector('#__next > div > div.flex > div > div > div.mx-auto > div.h-full > div > div');
    const shadowRoot = shadowHost.shadowRoot;
    const content = shadowRoot.querySelector('.DC2CN');
    content.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        if (element.tagName === 'P') {
            removeAttributes(element, ['id', 'data-p-id', 'data-original-font-size', 'data-original-line-height', 'style']);
        }
    });
    return content.innerHTML;
}

function grabRidi() {
    let fullText = '';
    let title = document.querySelector('title').textContent;
    // remove ' – Ridi' from the title
    title = title.replace(' - Ridi', '');

    // Ridi can have multiple articles in one page
    const articles = document.querySelectorAll('article');
    articles.forEach(article => {
        removeComments(article);
        article.querySelectorAll('*').forEach(element => {
            removeFontTags(element);
            removeTags(element, ['PRE', 'TITLE', 'LINK']);
            removeBlockClasses(element);
            removeClasses(element, ['body', 'story_part_header_title']);
            removeAttributes(element, ['style']);
            removeEmptyParagraphAndHeadings(element);
        });
        fullText += article.innerHTML;
    });

    // If there's no h tags, add h1 tag with the title
    if (fullText.search(/<h[1-6]/) === -1) {
        fullText = '<h1 class="auto-title">' + title + '</h1>' + fullText;
    }

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
    const title = document.querySelector('.p-novel__title');
    const chapter = document.querySelector('div.p-novel__body');

    title.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
    });
    chapter.querySelectorAll('*').forEach(element => {
        removeFontTags(element);
        if (element.tagName === 'P') {
            element.removeAttribute('id');
            element.textContent = element.textContent.trim();
        }
    });
    return title.outerHTML + '\n\n' + chapter.innerHTML;
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
    const cipher = 'tonquerzlawicvfjpsyhgdmkbxJKABRUDQZCTHFVLIWNEYPSXGOM';

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

        if (element.classList.contains('jum')) {
            dejumble(element, cipher);
        }
        removeClasses(element, ['jum', 'emoji']);
    });
    return '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
}

function grabSecondLifeTranslations() {
    const content = document.querySelector('.entry-content');
    const title = document.querySelector('.entry-title').textContent;
    const cipher = 'rhbndjzvqkiexcwsfpogytumalVUQXWSAZKBJNTLEDGIRHCPFOMY';

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
        if (element.classList.contains('jmbl')) {
            dejumble(element, cipher);
        }
        removeClasses(element, ['jmbl']);
        removeElementWithClasses(element, ['jmbl-ent', 'jmbl-disclaimer']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
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

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
        if (element.textContent.toLowerCase().includes('next chapter')) {
            nextChapter = true;
        }
        if (nextChapter) {
            element.remove();
        }
        // if element is a link, only keep the text inside it
        if (element.tagName === 'A') {
            element.outerHTML = element.textContent;
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
    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
}

function grabJjwxc() {
    const title = document.querySelector('.noveltitle').textContent;
    const content = document.querySelector('.novelbody');

    content.querySelectorAll('*').forEach(element => {
        removeAttributes(element, ['style']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabStorySeedling() {
    //content is in <div x-html="content">
    const content = document.querySelector('div[x-html="content"]');
    const title = document.querySelector('title').textContent;
    const cipher = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    const alphab = '⽂⽃⽄⽅⽆⽇⽈⽉⽊⽋⽌⽍⽎⽏⽐⽑⽒⽓⽔⽕⽖⽗⽘⽙⽚⽛⽜⽝⽞⽟⽠⽡⽢⽣⽤⽥⽦⽧⽨⽩⽪⽫⽬⽭⽮⽯⽰⽱⽲⽳⽴⽵';
    const warn = ' This content is owned by Story Seedling. If you are reading this on a site other than storyseedling.com, please report it to us.';

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        // remove all instances of cls followed by 18 other
        // e.g. clsf7ee7eab1744489659
        element.textContent = element.textContent.replace(/cls[^\s]{18}/g, '');
        dejumble(element, cipher, alphab);
        // replace warn with nothing
        element.textContent = element.textContent.replace(warn, '');
        removeAttributes(element, ['class']);
    });
    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabFictioneer() {
    let storyName = document.querySelector('.chapter__story-link')?.textContent;
    let title = document.querySelector('.chapter__title')?.textContent;
    let subtitle = document.querySelector('.chapter__second-title')?.textContent ||
        document.querySelector('.chapter__group')?.textContent;
    if (subtitle) { title += ': ' + subtitle; }
    if (storyName) { title = storyName + ': ' + title; }

    let content = document.querySelector('.chapter-formatting') ||
        document.querySelector('#chapter-content');

    const footnotes = document.querySelector('.chapter__footnotes');

    content.querySelectorAll('*').forEach(element => {
        removeSpansInsideParagraph(element);
        removeAttributes(element, ['id', 'data-paragraph-id']);
        removeElementWithClasses(element, ['eoc-chapter-groups', 'chapter-nav']);
    });
    content = '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
    if (footnotes) { content += '\n\n' + footnotes.innerHTML; }

    return content;
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
    const title = document.querySelector('.text-2xl').textContent;

    // the content is inside the section tag
    // it's in the first div that has a class that starts with __className_
    let content = document.querySelector('section');
    content = content.querySelector('div[class^="__className_"]');

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
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

function grabNovelingua() {
    const content = document.querySelector('.p-cyr2166') ||
        document.querySelector('.p-alh4926') ||
        document.querySelector('article') ||
        document.querySelector('.entry-content');

    // title is in the canonical link
    let canonical = document.querySelector('link[rel="canonical"]').href.split('/');
    let title = canonical.pop();
    if (title === '') {
        title = canonical.pop();
    }

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
}

function grabZenithtls() {
    const content = document.querySelector('article');
    // title is all the text inside the ol tag inside header tag, with the li items in reverse order
    let title = '';
    const ol = document.querySelector('header ol');

    if (ol) {
        const li = ol.querySelectorAll('li');
        for (let i = li.length - 1; i >= 0; i--) {
            //title += li[i].textContent + ' ';
            // skip if it's Home or /
            if (li[i].textContent === 'Home' || li[i].textContent === '/') {
                continue;
            }
            title += li[i].textContent + '_';
        }
        // replace all spaces and apostrophes with underscores
        title = title.replace(/ /g, '_');
        // remove apostrophes and make sure to properly escape the ' character in the regex
        title = title.replace(/'/g, '');
    }

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);

        // if element is div or span, remove it but keep the inner text
        if (element.tagName === 'DIV' || element.tagName === 'SPAN') {
            try {
                element.outerHTML = element.innerHTML;
            } catch (e) {
                console.log(e);
            }
        }
    });

    // if element is P, replace all newlines with </p><p>
    content.querySelectorAll('p').forEach(element => {
        element.innerHTML = element.innerHTML.replace(/\n/g, '</p>\n<p>');
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabReadhive() {
    // content is in div with class 'prose'
    const content = document.querySelector('.prose');
    let title = document.querySelector('title').textContent;
    // remove ' – Readhive' from the title
    title = title.replace(' – Readhive', '');

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
        // remove 'span' tag elements while keeping the inner text
        if (element.tagName === 'SPAN') {
            element.outerHTML = element.innerHTML;
        }
        removeElementWithClasses(element, ['absolute', 'fixed', 'flex', 'sticky']);
        removeAttributes(element, ['@click']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabPeachTeaAgency() {
    const content = document.querySelector('.transition-all');
    // title is all the text inside the ol tag inside nav tag, with the li items
    let title = '';
    const ol = document.querySelector('nav ol');

    if (ol) {
        const li = ol.querySelectorAll('li');
        for (let i = 1; i < li.length; i++) {
            // text is in the a tag
            title += li[i].querySelector('a').textContent + ' ';
        }

        // replace all spaces and apostrophes with underscores
        title = title.trim().replace(/ /g, '_');
        // remove apostrophes and make sure to properly escape the ' character in the regex
        title = title.replace(/'/g, '');
    }

    // wrap raw text in p tags
    // Find text nodes that are direct children of the content div
    const textNodes = [];
    const walker = document.createTreeWalker(
        content,
        NodeFilter.SHOW_TEXT,
        { acceptNode: node => node.nodeType === Node.TEXT_NODE && node.nodeValue.trim() !== '' ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT }
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
            const p = document.createElement('p');
            p.textContent = text;
            node.parentNode.replaceChild(p, node);
        }
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
}

function grabAO3() {
    // content is in the first div with the class .chapter
    const content = document.querySelector('div.chapter');
    // title is the h2 tag with the classed 'title heading' + the text of h3 class 'title'
    let title = document.querySelector('.title.heading').textContent.trim();
    title += ' - ' + document.querySelector('h3.title').textContent.trim();

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
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

function grabFanfictionNet() {
    const content = document.querySelector('.storytext');
    const title = document.querySelector('title').textContent;
    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
}

function grabFenrir() {
    const content = document.querySelector('#reader-area');
    // title is the first h1
    const title = document.querySelector('h1')?.textContent
    ??  document.querySelector('title').textContent;

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + generalCleanup(content);
}

function grabReaperScans() {
    const content = document.querySelector('#reader-container');
    return generalCleanup(content);
}

function grabNovelTranslationNet() {
    // This is trash that doesn't work in the extension, but works
    // fine in the browser console. Why???
    const content = document.querySelector('pre');
    return content.textContent;
}

function grabKaristudio() {
    const content = document.querySelector('article');
    const title = document.querySelector('.title').textContent;

    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
        removeClasses(element, ['chapter_content']);
    });

    return '<h1>' + title.trim() + '</h1>' + '\n\n' + content.innerHTML;
}

function grabUnknown() {
    const content = document.querySelector('body');
    return generalCleanup(content);
}

function generalCleanup(content) {
    aggressiveCleanupContent(content);
    content.querySelectorAll('*').forEach(element => {
        aggressiveCleanupElement(element);
    });
    return content.innerHTML;
}

function getAllLinks() {
    let links = document.querySelectorAll('a');
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

function logAllLinks() {
    document.querySelectorAll('a').forEach(link => {
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, ' ');
        if (link.text.toLowerCase().includes('chapter')) {
            console.log('<a href="' + link.href +'">' + link.text  + '</a>');
        }
    });
}


function dangerLinks() {
    const links = document.querySelectorAll('a.text-danger');
    let allLinks = '';
    links.forEach(link => {
        allLinks += link.href +'\n';
    });
    console.log(allLinks);
}


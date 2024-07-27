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

function removeFontTags(element) {
    // remove 'font' tag elements while keeping the inner text
    if (element.tagName === 'FONT') {
        if (element.children.length > 0 && element.children[0].tagName === 'FONT') {
            // remove a second 'font' tag element if it exists while keeping the inner html
            element.outerHTML = element.children[0].innerHTML;
        } else {
            element.outerHTML = element.innerHTML;
        }
    }
}

function grabKakaoPage() {
    const content = document.querySelector('.DC2CN');
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

    const articles = document.querySelectorAll('article');
    // For each article element, print the contents to the console
    articles.forEach(article => {
        article.querySelectorAll('*').forEach(element => {
            removeFontTags(element);

            // remove 'pre' tag elements
            if (element.tagName === 'PRE') {
                element.outerHTML = '';
            }

            element.classList.remove('block_1');
            element.classList.remove('body');
            element.removeAttribute('style');
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
        if (element.tagName === 'LINK' || element.tagName === 'BASE' || element.tagName === 'META') {
            element.outerHTML = '';
        } else if (element.tagName === 'TITLE') {
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
        }
    });

    let fullText = '<h1>' + title + '</h1>' + '\n\n' + chapter.innerHTML;
    copyToClipboard(fullText);
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

    // remove element with id goog-gt-tt
    const googleTranslate = document.querySelector('#goog-gt-tt');
    googleTranslate.outerHTML = '';

    copyToClipboard(content.innerHTML);
}

function getAllLinks() {
    const links = document.querySelectorAll('a');
    let allLinks = '';
    links.forEach(link => {
        // if the link text has more than 1000 characters, skip it
        // if (link.text.length > 1000) {
        //     return;
        // }
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, ' ');
        allLinks += '<a href="' + link.href +'">' + link.text  + '</a>\n';
    });
    console.log(allLinks);
    copyToClipboard(allLinks);
}


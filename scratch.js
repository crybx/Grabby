// These aren't used, but are handy for copy and paste into the console.
// noinspection JSUnusedGlobalSymbols

function getAllLinks() {
    let links = document.querySelectorAll("a");
    let allLinks = "";
    links.forEach(link => {
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, " ");
        // if text contains "chapter" or "Chapter", add it to the allLinks
        if (link.text.toLowerCase().includes("chapter")) {
            allLinks += `<a href="${link.href}">${link.text}</a>\n`;
        }
        //allLinks += `<a href="${link.href}">${link.text}</a>\n`;
    });
    console.log(allLinks);
    return allLinks;
}

function logAllLinks() {
    document.querySelectorAll("a").forEach(link => {
        // remove all consecutive whitespace characters
        link.text = link.text.replace(/\s+/g, " ");
        if (link.text.toLowerCase().includes("chapter")) {
            console.log(`<a href="${link.href}">${link.text}</a>`);
        }
    });
}

function dangerLinks() {
    const links = document.querySelectorAll("a.text-danger");
    let allLinks = "";
    links.forEach(link => {
        allLinks += link.href + "\n";
    });
    console.log(allLinks);
}

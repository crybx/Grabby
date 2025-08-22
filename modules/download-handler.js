// DownloadHandler - Handles file downloads
export class DownloadHandler {
    async downloadAsFile(title, blobUrl, cleanup) {
        let fileName = title;
        // # and , are not illegal, but they are annoying
        let illegalWindowsFileNameRegex = /[<>:"#!/\\|?*]/g;
        fileName = fileName.replace(illegalWindowsFileNameRegex, "");

        // remove 'Ridi' from the filename
        fileName = fileName.replace(" - Ridi", "");
        // remove any other whitespace
        fileName = fileName.replace(/\s/g, "_");
        // replace . with _ in the filename
        fileName = fileName.replace(/\./g, "_");
        // replace comma with nothing
        fileName = fileName.split(",").join("");
        // collapse multiple consecutive underscores to single underscore
        fileName = fileName.replace(/_+/g, "_");
        fileName = fileName + ".html";
        let options = {
            url: blobUrl,
            filename: fileName,
            saveAs: false
        };

        const downloadId = await chrome.downloads.download(options, cleanup);
    }
}
#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
let zipjs;

const DIST_DIR = "dist";
let ZIP_NAME = "grabby-extension.zip"; // Default, will be updated with version

// Files and directories to exclude from the package
const EXCLUDE_PATTERNS = [
    "node_modules",
    "package.json",
    "package-lock.json",
    "build.js",
    "dist",
    ".git",
    ".github",
    ".gitignore",
    ".eslintrc.js",
    "docs",
    "*.log",
    "*.zip",
    "jsconfig.json",
    "README.md"
];

console.log("Building Grabby extension package...");

// Clean and create dist directory
if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
}
fs.mkdirSync(DIST_DIR);

// Copy files, excluding development files
function shouldExclude(filePath) {
    return EXCLUDE_PATTERNS.some(pattern => {
        if (pattern.includes("*")) {
            return filePath.match(pattern.replace("*", ".*"));
        }
        return filePath.includes(pattern);
    });
}

function copyRecursiveSync(src, dest) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
  
    if (isDirectory) {
        fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(function(childItemName) {
            const srcPath = path.join(src, childItemName);
            const destPath = path.join(dest, childItemName);
      
            // Don't apply exclusion logic during recursive copying
            copyRecursiveSync(srcPath, destPath);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

// Copy all files except excluded ones
const items = fs.readdirSync(".");
items.forEach(item => {
    if (!shouldExclude(item)) {
        const srcPath = path.resolve(item);
        const destPath = path.join(DIST_DIR, item);
        copyRecursiveSync(srcPath, destPath);
        console.log(`Copied ${item}`);
    }
});

// Update version in manifest if needed
const manifestPath = path.join(DIST_DIR, "manifest.json");
const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

// Read version from package.json if it exists
if (fs.existsSync("package.json")) {
    const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
    manifest.version = pkg.version;
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
    
    // Update ZIP filename to include version
    const buildSuffix = process.env.BUILD_SUFFIX || "";
    ZIP_NAME = `grabby-${pkg.version}${buildSuffix}.zip`;
    
    console.log(`Updated version to ${pkg.version}`);
}

// Add all files from dist folder to zip
async function addDirectoryToZip(dirPath, zipWriter, zipPath = "") {
    const items = fs.readdirSync(dirPath);
      
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const zipItemPath = zipPath ? path.posix.join(zipPath, item) : item;
        
        if (fs.statSync(fullPath).isDirectory()) {
            await addDirectoryToZip(fullPath, zipWriter, zipItemPath);
        } else {
            const data = fs.readFileSync(fullPath);
            await zipWriter.add(zipItemPath, new zipjs.Uint8ArrayReader(data));
        }
    }
}

// Create ZIP package using zip.js
async function createZipPackage() {
    try {
    // Dynamically import zip.js
        zipjs = await import("@zip.js/zip.js");
    
        const zipFileWriter = new zipjs.BlobWriter("application/zip");
        const zipWriter = new zipjs.ZipWriter(zipFileWriter, {
            useWebWorkers: false,
            compressionMethod: 8,
            extendedTimestamp: false
        });

        await addDirectoryToZip(DIST_DIR, zipWriter);
    
        const zipBlob = await zipWriter.close();
        const zipBuffer = await zipBlob.arrayBuffer();
    
        fs.writeFileSync(ZIP_NAME, Buffer.from(zipBuffer));
        console.log(`Created ${ZIP_NAME}`);
    
    } catch (error) {
        console.error("Error creating ZIP:", error.message);
        console.log("Falling back to manual zip instructions");
        console.log("Please manually zip the contents of the dist/ folder");
        return;
    }
}

// Main build process
async function build() {
    await createZipPackage();
  
    // Calculate package size if zip was created
    if (fs.existsSync(ZIP_NAME)) {
        const stats = fs.statSync(ZIP_NAME);
        const fileSizeInMB = stats.size / (1024 * 1024);
        console.log(`Package size: ${fileSizeInMB.toFixed(2)} MB`);

        if (fileSizeInMB > 2000) {
            console.warn("Warning: Package is larger than 2GB limit!");
        } else {
            console.log("Package size is within Chrome Web Store limits");
        }
    }

    console.log("\nBuild complete!");
    console.log(`Files staged in: ${DIST_DIR}/`);
    if (fs.existsSync(ZIP_NAME)) {
        console.log(`Package created: ${ZIP_NAME}`);
    }
    console.log("\nNext steps:");
    console.log("1. Test the extension by loading the dist/ folder as unpacked in chrome://extensions");
    if (fs.existsSync(ZIP_NAME)) {
        console.log("2. If everything works, " + ZIP_NAME + " is ready for distribution");
    } else {
        console.log("2. Manually zip the dist/ folder contents for distribution");
    }
}

// Run the build
build().catch(error => {
    console.error("Build failed:", error);
    process.exit(1);
});
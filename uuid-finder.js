// UUID/Hash finder script - searches all JavaScript objects for UUIDs and hashes
// Run this in the browser console to find all UUIDs on the page

(function() {
    "use strict";
    
    function findAllUUIDs() {
        const found = {
            uuids: new Set(),
            md5Hashes: new Set(),
            otherHashes: new Set(),
            locations: []
        };
        
        // Search through any object recursively
        function searchObject(obj, path = "root", depth = 0, maxDepth = 5) {
            if (depth > maxDepth) return;
            if (!obj || typeof obj !== "object") return;
            
            try {
                for (const key in obj) {
                    if (obj.hasOwnProperty && !Object.prototype.hasOwnProperty.call(obj, key)) continue;
                    
                    try {
                        const value = obj[key];
                        const currentPath = `${path}.${key}`;
                        
                        if (typeof value === "string") {
                            // UUID pattern (36 chars with dashes)
                            if (value.match(/^[0-9a-f-]{36}$/i)) {
                                found.uuids.add(value);
                                found.locations.push(`UUID at ${currentPath}: ${value}`);
                            }
                            // MD5 hash (32 hex chars)
                            else if (value.match(/^[0-9a-f]{32}$/i)) {
                                found.md5Hashes.add(value);
                                found.locations.push(`MD5 at ${currentPath}: ${value}`);
                            }
                            // Other hashes (20-64 hex chars)
                            else if (value.match(/^[0-9a-f]{20,64}$/i)) {
                                found.otherHashes.add(value);
                                found.locations.push(`Hash at ${currentPath}: ${value}`);
                            }
                        } else if (typeof value === "object" && value !== null && depth < maxDepth) {
                            searchObject(value, currentPath, depth + 1, maxDepth);
                        }
                    } catch (e) {
                        // Skip properties that throw errors when accessed
                    }
                }
            } catch (e) {
                // Skip objects that can't be enumerated
            }
        }
        
        console.log("🔍 Searching window object...");
        searchObject(window, "window");
        
        // Search common Next.js/React locations
        const commonLocations = [
            { obj: window.__NEXT_DATA__, name: "__NEXT_DATA__" },
            { obj: window.next, name: "next" },
            { obj: window.__INITIAL_STATE__, name: "__INITIAL_STATE__" },
            { obj: window.__APP_DATA__, name: "__APP_DATA__" },
            { obj: window.pageProps, name: "pageProps" },
            { obj: window._store, name: "_store" },
            { obj: window.store, name: "store" },
            { obj: window.Redux, name: "Redux" },
            { obj: window.__REDUX_STORE__, name: "__REDUX_STORE__" }
        ];
        
        commonLocations.forEach(({ obj, name }) => {
            if (obj) {
                console.log(`🔍 Searching ${name}...`);
                searchObject(obj, name);
            }
        });
        
        // Search all script tags
        console.log("🔍 Searching script tags...");
        const scripts = document.querySelectorAll("script");
        scripts.forEach((script, index) => {
            if (script.textContent && !script.src) {
                const content = script.textContent;
                
                // Find UUIDs in script content
                const uuidMatches = content.match(/[0-9a-f-]{36}/gi);
                if (uuidMatches) {
                    uuidMatches.forEach(uuid => {
                        if (uuid.match(/^[0-9a-f-]{36}$/i)) {
                            found.uuids.add(uuid);
                            found.locations.push(`UUID in script ${index}: ${uuid}`);
                        }
                    });
                }
                
                // Find MD5 hashes
                const md5Matches = content.match(/[0-9a-f]{32}/gi);
                if (md5Matches) {
                    md5Matches.forEach(hash => {
                        found.md5Hashes.add(hash);
                        found.locations.push(`MD5 in script ${index}: ${hash}`);
                    });
                }
                
                // Find other hashes
                const hashMatches = content.match(/[0-9a-f]{20,64}/gi);
                if (hashMatches) {
                    hashMatches.forEach(hash => {
                        if (!hash.match(/^[0-9a-f]{32}$/i)) { // Skip MD5s already found
                            found.otherHashes.add(hash);
                            found.locations.push(`Hash in script ${index}: ${hash}`);
                        }
                    });
                }
            }
        });
        
        // Search localStorage and sessionStorage
        console.log("🔍 Searching browser storage...");
        [localStorage, sessionStorage].forEach((storage, storageIndex) => {
            const storageName = storageIndex === 0 ? "localStorage" : "sessionStorage";
            try {
                for (let i = 0; i < storage.length; i++) {
                    const key = storage.key(i);
                    const value = storage.getItem(key);
                    
                    if (value) {
                        // Check key and value for hashes
                        [key, value].forEach((str, isValue) => {
                            const location = isValue ? "value" : "key";
                            
                            if (str.match(/^[0-9a-f-]{36}$/i)) {
                                found.uuids.add(str);
                                found.locations.push(`UUID in ${storageName}.${key}.${location}: ${str}`);
                            } else if (str.match(/^[0-9a-f]{32}$/i)) {
                                found.md5Hashes.add(str);
                                found.locations.push(`MD5 in ${storageName}.${key}.${location}: ${str}`);
                            }
                        });
                    }
                }
            } catch (e) {
                console.warn(`Could not search ${storageName}:`, e);
            }
        });
        
        return found;
    }
    
    // Make it available globally
    window.findAllUUIDs = findAllUUIDs;
    
    // Auto-run and display results
    console.log("🚀 Starting UUID/Hash search...");
    const results = findAllUUIDs();
    
    console.log("\n📊 RESULTS SUMMARY:");
    console.log(`UUIDs found: ${results.uuids.size}`);
    console.log(`MD5 hashes found: ${results.md5Hashes.size}`);
    console.log(`Other hashes found: ${results.otherHashes.size}`);
    
    if (results.uuids.size > 0) {
        console.log("\n🆔 UUIDs:");
        Array.from(results.uuids).forEach(uuid => console.log(`  ${uuid}`));
    }
    
    if (results.md5Hashes.size > 0) {
        console.log("\n🔐 MD5 Hashes:");
        Array.from(results.md5Hashes).forEach(hash => console.log(`  ${hash}`));
    }
    
    if (results.otherHashes.size > 0) {
        console.log("\n🔢 Other Hashes:");
        Array.from(results.otherHashes).slice(0, 20).forEach(hash => console.log(`  ${hash}`));
        if (results.otherHashes.size > 20) {
            console.log(`  ... and ${results.otherHashes.size - 20} more`);
        }
    }
    
    // Show detailed locations (limited to avoid spam)
    console.log("\n📍 DETAILED LOCATIONS (first 50):");
    results.locations.slice(0, 50).forEach(location => console.log(`  ${location}`));
    if (results.locations.length > 50) {
        console.log(`  ... and ${results.locations.length - 50} more locations`);
    }
    
    // Create URL mapping for book chapters
    const currentUrl = window.location.href;
    const bookMatch = currentUrl.match(/\/books\/(\d+)/);
    if (bookMatch) {
        const bookId = bookMatch[1];
        console.log(`\n🔗 POTENTIAL CHAPTER URLS for book ${bookId}:`);
        
        const allHashes = [...results.uuids, ...results.md5Hashes];
        allHashes.slice(0, 10).forEach(hash => {
            const chapterUrl = `https://peachtea.agency/books/${bookId}/${hash}`;
            console.log(`  ${chapterUrl}`);
        });
        
        if (allHashes.length > 10) {
            console.log(`  ... and ${allHashes.length - 10} more potential URLs`);
        }
    }
    
    console.log("\n✅ Search complete! Results stored in window.lastUUIDResults");
    window.lastUUIDResults = results;
    
    return results;
})();
#!/usr/bin/env node

/*
 * Regenerates parser-registry.js from the parser sources in epub/js/parsers/.
 *
 * Every domain Grabby can route to WebToEpub is already declared at a call site:
 *
 *     parserFactory.register("example.com", () => new ExampleParser());
 *     parserFactory.registerDeadSite("gone.com", () => new GoneParser());
 *
 * The domain, the parser class and the file it lives in all come free from that call, so
 * the registry is derived rather than hand-maintained. Hand-editing it let it drift out of
 * sync with the parsers Grabby actually ships.
 *
 * Only the top level of epub/js/parsers/ is scanned, because script-injector.js loads
 * parsers as `epub/js/parsers/${file}`. Parsers in subdirectories (experimental/) select
 * themselves with registerUrlRule instead of a domain key, so there is nothing to emit.
 *
 * Usage:
 *   node generate-parser-registry.js            rewrite parser-registry.js
 *   node generate-parser-registry.js --check    exit 1 if it is out of date, write nothing
 *
 * Also invoked automatically by build.js.
 */

"use strict";

const fs = require("fs");
const path = require("path");

const PARSERS_DIR = path.join(__dirname, "epub", "js", "parsers");
const REGISTRY_PATH = path.join(__dirname, "parser-registry.js");

/*
 * Extra fields that can't be derived from the parser sources, keyed by domain.
 *
 * - liveMode: true if the site needs its content loaded in an active tab (JS execution,
 *   anti-bot checks) before it's in the DOM. See Live-Mode-Plan.md.
 *
 * Example:
 *   "cherrymist.cafe": { liveMode: true },
 */
const OVERRIDES = {
};

// Matches both registration forms, across line breaks (CClawTranslationsParser.js wraps).
const REGISTRATION_RE =
    /parserFactory\.(registerDeadSite|register)\s*\(\s*"([^"]+)"\s*,\s*\(\s*\)\s*=>\s*new\s+([A-Za-z0-9_$]+)\s*\(/g;

// Same call prefixes, without the argument shape, so unparseable calls can be reported
// instead of silently dropped.
const REGISTRATION_PREFIX_RE = /parserFactory\.(registerDeadSite|register)\s*\(/g;

function countMatches(text, regex) {
    return (text.match(regex) || []).length;
}

function collectRegistrations() {
    const files = fs.readdirSync(PARSERS_DIR, { withFileTypes: true })
        .filter(entry => entry.isFile() && entry.name.endsWith(".js"))
        .map(entry => entry.name)
        .sort();

    const registry = {};
    const problems = [];

    for (const file of files) {
        const source = fs.readFileSync(path.join(PARSERS_DIR, file), "utf8");

        let matched = 0;
        REGISTRATION_RE.lastIndex = 0;
        let match;
        while ((match = REGISTRATION_RE.exec(source)) !== null) {
            matched += 1;
            const [, kind, domain, parserClass] = match;
            const existing = registry[domain];
            if (existing !== undefined) {
                problems.push(`duplicate registration for "${domain}": `
                    + `${existing.file} and ${file} (ParserFactory throws on this)`);
                continue;
            }
            registry[domain] = {
                parserClass,
                file,
                deadSite: kind === "registerDeadSite"
            };
        }

        const declared = countMatches(source, REGISTRATION_PREFIX_RE);
        if (declared !== matched) {
            problems.push(`${file}: ${declared - matched} registration call(s) did not `
                + "match the expected \"() => new XParser()\" shape and were skipped");
        }
    }

    return { registry, problems };
}

function applyOverrides(registry) {
    const unused = [];
    for (const [domain, extra] of Object.entries(OVERRIDES)) {
        if (registry[domain] === undefined) {
            unused.push(domain);
            continue;
        }
        Object.assign(registry[domain], extra);
    }
    return unused;
}

function formatEntry(domain, entry) {
    const fields = [
        `parserClass: "${entry.parserClass}"`,
        `file: "${entry.file}"`
    ];
    if (entry.liveMode) {
        fields.push("liveMode: true");
    }
    if (entry.deadSite) {
        fields.push("deadSite: true");
    }
    return `    "${domain}": { ${fields.join(", ")} },`;
}

function buildHeader(domainCount, deadCount) {
    return `/**
 * Parser Registry - Maps domains to WebToEpub parser classes
 *
 * GENERATED FILE - do not edit by hand.
 * Run \`node generate-parser-registry.js\` (or \`npm run build\`) to regenerate it from the
 * parserFactory.register() calls in epub/js/parsers/. Fields that can't be derived from
 * the parser sources live in the OVERRIDES map in that script.
 *
 * This static registry maps domain names to their corresponding WebToEpub parser
 * information. Used as a fallback when Grabby doesn't have a native grabber for a site.
 *
 * Structure:
 * - parserClass: The class name of the parser
 * - file: The filename in epub/js/parsers/ directory
 * - liveMode (optional): true if the site requires content to be loaded in an active
 *   tab (JS execution, anti-bot checks, etc.) before content is in the DOM. When set,
 *   EPUB packing routes per-chapter fetches through Grabby's live-mode background
 *   handler instead of HttpClient. See Live-Mode-Plan.md.
 * - deadSite (optional): true if upstream registered the site with registerDeadSite(),
 *   i.e. the site is believed gone. The parser still loads and runs; this is a note.
 *
 * Total supported domains: ${domainCount} (${deadCount} marked dead upstream)
 */
`;
}

// Everything after the registry object literal (the window export and the lookup helper)
// is hand-written and preserved as-is.
function readTrailer() {
    const current = fs.readFileSync(REGISTRY_PATH, "utf8");
    const marker = "\n};\n";
    const end = current.indexOf(marker);
    if (end === -1) {
        throw new Error(`Could not find the end of PARSER_REGISTRY in ${REGISTRY_PATH}`);
    }
    return current.slice(end + marker.length);
}

function buildRegistryFile() {
    const { registry, problems } = collectRegistrations();
    const unusedOverrides = applyOverrides(registry);
    for (const domain of unusedOverrides) {
        problems.push(`OVERRIDES entry for "${domain}" matches no registered parser`);
    }

    const domains = Object.keys(registry).sort();
    const deadCount = domains.filter(domain => registry[domain].deadSite).length;

    const body = domains.map(domain => formatEntry(domain, registry[domain])).join("\n");
    const contents = buildHeader(domains.length, deadCount)
        + "\nlet PARSER_REGISTRY = {\n"
        + body.replace(/,$/, "")
        + "\n};\n"
        + readTrailer();

    return { contents, domainCount: domains.length, deadCount, problems };
}

function generateParserRegistry({ check = false } = {}) {
    const { contents, domainCount, deadCount, problems } = buildRegistryFile();

    for (const problem of problems) {
        console.warn(`parser-registry: ${problem}`);
    }

    const current = fs.readFileSync(REGISTRY_PATH, "utf8");
    if (current === contents) {
        console.log(`parser-registry.js is up to date (${domainCount} domains)`);
        return { changed: false, domainCount, deadCount };
    }

    if (check) {
        console.error("parser-registry.js is out of date - run "
            + "`node generate-parser-registry.js`");
        process.exitCode = 1;
        return { changed: true, domainCount, deadCount };
    }

    fs.writeFileSync(REGISTRY_PATH, contents);
    console.log(`Regenerated parser-registry.js (${domainCount} domains, `
        + `${deadCount} marked dead upstream)`);
    return { changed: true, domainCount, deadCount };
}

module.exports = { generateParserRegistry };

if (require.main === module) {
    generateParserRegistry({ check: process.argv.includes("--check") });
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectDuplicateJsonKey = detectDuplicateJsonKey;
const unicodeNormalize_1 = require("../unicodeNormalize");
// A raw-text scan, not a JSON.parse-based one: JSON.parse silently collapses
// duplicate keys onto the last occurrence before this code would ever see
// the parsed object, so parsing first and inspecting Object.keys() cannot
// detect a duplicate -- by the time you have an object, the duplicate is
// already gone. This walks the raw string instead, tracking brace/bracket
// depth so only keys directly inside the root object (depth === 1) are
// collected -- two different servers each having their own "command" key
// are at depth 3, not depth 1, and are correctly not duplicates of each
// other. Only the character class ('"', '{', '[', '}', ']', and backslash
// inside strings) matters; nothing here needs full JSON validation, since
// the JSON.parse gate below already rejects genuinely malformed content.
function findTopLevelKeys(content) {
    const keys = [];
    const len = content.length;
    let i = 0;
    while (i < len && /\s/.test(content[i])) {
        i++;
    }
    if (content[i] !== '{') {
        return keys;
    }
    let depth = 1;
    i++;
    while (i < len && depth > 0) {
        const ch = content[i];
        if (ch === '"') {
            const start = i;
            i++;
            while (i < len) {
                if (content[i] === '\\') {
                    i += 2;
                    continue;
                }
                if (content[i] === '"') {
                    i++;
                    break;
                }
                i++;
            }
            // A string immediately followed by ':' (module whitespace) is a key,
            // not a value -- valid JSON object syntax never puts ':' after a
            // value string. Only keys directly inside the root object count.
            if (depth === 1) {
                let j = i;
                while (j < len && /\s/.test(content[j])) {
                    j++;
                }
                if (content[j] === ':') {
                    try {
                        keys.push(JSON.parse(content.slice(start, i)));
                    }
                    catch {
                        // Malformed string escape; skip rather than crash the scan.
                    }
                }
            }
            continue;
        }
        if (ch === '{' || ch === '[') {
            depth++;
            i++;
            continue;
        }
        if (ch === '}' || ch === ']') {
            depth--;
            i++;
            continue;
        }
        i++;
    }
    return keys;
}
// Current-state check like RF-1/RF-2/DD-5/DD-6: a duplicate top-level key is
// a live risk on every PR it's still present in, so this only ever looks at
// head content.
function detectDuplicateJsonKey(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    // JSON.parse here is only a validity gate (fail open on genuinely
    // malformed content, matching every other detector's convention) -- its
    // result is discarded. It cannot be used to find the duplicate itself,
    // since it silently resolves duplicate keys to the last occurrence.
    try {
        JSON.parse(headContent);
    }
    catch {
        return [];
    }
    const keys = findTopLevelKeys(headContent);
    // Tracked by normalized key (Task 5.8): two top-level keys that render
    // identically to a reviewer but differ only in Unicode normalization form
    // (e.g. one NFC, one NFD) are just as real a duplicate-key smuggling risk
    // as a byte-identical repeat -- a reviewer skimming the file sees the same
    // text twice either way. The raw `key` (as it appears at the second
    // occurrence) is still what gets displayed in the finding.
    const seen = new Set();
    const alreadyFlagged = new Set();
    const findings = [];
    for (const key of keys) {
        const normalized = (0, unicodeNormalize_1.normalizeUnicode)(key);
        if (seen.has(normalized) && !alreadyFlagged.has(normalized)) {
            alreadyFlagged.add(normalized);
            findings.push({
                detectorId: 'diff-drift.duplicate-json-key',
                severity: 'warning',
                file: filePath,
                summary: `Duplicate top-level key '${key}' found`,
                detail: `The top-level key '${key}' appears more than once in ${filePath}. Some JSON parsers silently resolve a duplicate key to its last occurrence while others take the first, so a second occurrence can smuggle a payload past a reviewer who only reads the first, legitimate-looking one.`,
            });
        }
        seen.add(normalized);
    }
    return findings;
}

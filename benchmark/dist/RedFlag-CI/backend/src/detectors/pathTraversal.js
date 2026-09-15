"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectPathTraversal = detectPathTraversal;
// Mirrors DD-1/DD-2's own parseMcpServerEntries: both "mcpServers" and
// "servers" are read and merged, "mcpServers" winning on a name collision,
// duplicated locally rather than imported since this task is scoped to
// touching only this file.
function parseMcpServerEntries(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        const obj = parsed;
        const merged = {};
        for (const candidate of [obj.servers, obj.mcpServers]) {
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                Object.assign(merged, candidate);
            }
        }
        return merged;
    }
    catch {
        return null;
    }
}
function getField(entry, field) {
    if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) {
        return undefined;
    }
    return entry[field];
}
// Path traversal detection explicitly targets parent directory navigation
// sequences ("../" or "..\"). Legitimate relative paths rooted in the current
// directory ("./config", "./src/index.js"), plain relative filenames
// ("config/settings.json"), and non-path tokens containing double dots without
// path separators (such as version ranges "1..10" or git revspecs "main..head")
// are safe and produce no findings. Requiring an explicit slash or backslash
// after ".." ("../" or "..\") prevents false positives on benign CLI flags and
// identifier strings while reliably flagging directory traversal attempts.
//
// Also matches the fullwidth solidus (U+FF0F "／") and fullwidth reverse
// solidus (U+FF3C "＼") as separators, not just their ASCII look-alikes
// (redflag-ci-adversarial-tests/STRESS_TEST_FINDINGS.md, INT-A1): "..／etc／passwd" renders as a
// near-identical traversal sequence to a human reviewer but is built from
// different code points than "../etc/passwd", and the ASCII-only regex
// never matched it. Same Unicode-confusable awareness RF-1/RF-2 already
// apply elsewhere, extended to this detector.
const PATH_TRAVERSAL_REGEX = /\.\.[/\\／＼]/;
// Current-state check like RF-1/RF-2/DD-5/DD-6, not a diff: a path traversal
// sequence is a live risk on every PR it's still present in, so this only ever
// looks at head content.
function detectPathTraversal(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    const entries = parseMcpServerEntries(headContent);
    if (!entries) {
        return [];
    }
    const findings = [];
    for (const [serverName, definition] of Object.entries(entries)) {
        const stringsToCheck = [];
        const args = getField(definition, 'args');
        if (Array.isArray(args)) {
            for (const arg of args) {
                if (typeof arg === 'string') {
                    stringsToCheck.push(arg);
                }
            }
        }
        const env = getField(definition, 'env');
        if (typeof env === 'object' && env !== null && !Array.isArray(env)) {
            for (const val of Object.values(env)) {
                if (typeof val === 'string') {
                    stringsToCheck.push(val);
                }
            }
        }
        for (const val of stringsToCheck) {
            if (PATH_TRAVERSAL_REGEX.test(val)) {
                findings.push({
                    detectorId: 'diff-drift.path-traversal',
                    severity: 'warning',
                    file: filePath,
                    summary: `MCP server '${serverName}' uses path traversal sequence in '${val}'`,
                    detail: `The MCP server '${serverName}' in ${filePath} configures path traversal sequence '${val}'. Navigating outside expected directory boundaries using relative path sequences ('../' or '..\\') can expose sensitive system files or escape directory sandboxing.`,
                });
            }
        }
    }
    return findings;
}

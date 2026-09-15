"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectObfuscatedCommand = detectObfuscatedCommand;
// A token shorter than this is a flag, a short id, or an ordinary word --
// not enough characters to carry a useful payload. 20 is comfortably above
// any real CLI flag or short identifier, while still well under the length
// a base64-encoded shell one-liner or downloaded script needs to do
// anything (per the corpus's own "adversarial-encoded-payload-in-args"
// scenario: "echo pwned > /tmp/pwned" alone already encodes to 32 chars).
const MIN_BASE64_LENGTH = 20;
// Base64 alphabet, optionally right-padded with 1-2 "=" characters. The
// whole token must match -- a token containing anything outside this
// (a space, a "-", an "@", a ".") is not standalone base64, it's an
// ordinary word or path that happens to share some characters with it.
const BASE64_TOKEN = new RegExp(`^[A-Za-z0-9+/]{${MIN_BASE64_LENGTH},}=?=?$`);
// Every hex digit is also a valid base64 character, so a 32/40/64-char git
// commit hash, md5, or sha256 hex hash matches BASE64_TOKEN on charset and
// length alone. Real base64 of any length has roughly a 3-in-4 chance per
// character of landing outside the hex range (g-z, G-Z, "+", "/", "="), so
// excluding tokens that are hex digits from end to end is what keeps this
// detector from flagging every hash in sight.
const HEX_ONLY = /^[0-9a-fA-F]+$/;
// Literal "|" into "sh"/"bash", with or without a space on either side.
const PIPE_TO_SHELL = /\|\s*(sh|bash)\b/;
// A base64 blob embedded in a larger shell string is often wrapped in
// quotes ("...") or immediately followed by syntax punctuation (a
// semicolon, a closing paren) -- neither is part of the token itself, so
// strip them from both ends before charset-checking rather than requiring
// the whole whitespace-delimited token to be pure base64. The charset check
// itself (length, hex-only exclusion) still runs on what's left.
const SURROUNDING_PUNCTUATION = /^["'`([{]+|["'`)\]};,]+$/g;
function looksLikeBase64Blob(token) {
    const stripped = token.replace(SURROUNDING_PUNCTUATION, '');
    return BASE64_TOKEN.test(stripped) && !HEX_ONLY.test(stripped);
}
function truncate(text) {
    return text.length > 40 ? `${text.slice(0, 40)}...` : text;
}
// Mirrors DD-1/DD-2's own parseMcpServerEntries merge behavior ("mcpServers"
// and "servers" both read, "mcpServers" winning on a name collision),
// duplicated locally per this task's "new file only" scope.
function collectMcpCommandSources(obj) {
    const merged = {};
    for (const candidate of [obj.servers, obj.mcpServers]) {
        if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
            Object.assign(merged, candidate);
        }
    }
    const sources = [];
    for (const [name, definition] of Object.entries(merged)) {
        if (typeof definition !== 'object' || definition === null || Array.isArray(definition)) {
            continue;
        }
        const entry = definition;
        if (typeof entry.command === 'string') {
            sources.push({ label: `MCP server '${name}' command`, text: entry.command });
        }
        if (Array.isArray(entry.args)) {
            for (const arg of entry.args) {
                if (typeof arg === 'string') {
                    sources.push({ label: `MCP server '${name}' args`, text: arg });
                }
            }
        }
    }
    return sources;
}
// Only pulls the "command" string out of each hook entry -- unlike DD-4's
// own parseHooks, nothing here needs a stable key/eventName/matcher for
// diffing, since this is a current-state scan, not a comparison.
function collectHookCommandSources(obj) {
    const hooksObj = obj.hooks;
    if (hooksObj === undefined) {
        return [];
    }
    const sources = [];
    const addFromEntry = (label, entry) => {
        if (typeof entry === 'string') {
            sources.push({ label, text: entry });
        }
        else if (typeof entry === 'object' && entry !== null && !Array.isArray(entry)) {
            const command = entry.command;
            if (typeof command === 'string') {
                sources.push({ label, text: command });
            }
        }
    };
    if (Array.isArray(hooksObj)) {
        hooksObj.forEach((item, i) => addFromEntry(`Hook[${i}]`, item));
        return sources;
    }
    if (typeof hooksObj !== 'object' || hooksObj === null) {
        return sources;
    }
    for (const [key, value] of Object.entries(hooksObj)) {
        if (Array.isArray(value)) {
            value.forEach((item) => addFromEntry(`Hook '${key}'`, item));
        }
        else {
            addFromEntry(`Hook '${key}'`, value);
        }
    }
    return sources;
}
// Labels are already sentence-ready ("MCP server 'x' args", "Hook 'x'") and
// used verbatim in both the summary and mid-sentence in detail -- unlike a
// plain English phrase, "MCP" can't be selectively lowercased at word start
// without corrupting the acronym, so no case transformation happens here.
function buildFinding(filePath, source, kind, evidence) {
    if (kind === 'pipe') {
        return {
            detectorId: 'diff-drift.obfuscated-command',
            severity: 'high',
            file: filePath,
            summary: `${source.label} pipes output directly into a shell`,
            detail: `The ${source.label} in ${filePath} pipes its output directly into a shell ('${evidence}'). Piping a downloaded or generated payload straight into sh/bash executes it without the actual command ever appearing as readable, reviewable text in a diff.`,
        };
    }
    return {
        detectorId: 'diff-drift.obfuscated-command',
        severity: 'high',
        file: filePath,
        summary: `${source.label} contains a base64-looking blob`,
        detail: `The ${source.label} in ${filePath} contains a long base64-looking token ('${truncate(evidence)}'). Encoding a payload this way lets it pass through review as an opaque string while a shell or interpreter still decodes and runs it.`,
    };
}
// Current-state check like RF-1/RF-2 and the unpinned-MCP-dependency check,
// not a diff: an obfuscated command already sitting in head is live on every
// PR it's still present in. Runs on both MCP-server-shaped files and
// .claude/settings.json alike -- both are handed the same head content, and
// each extractor above simply finds nothing if its own key isn't present.
function detectObfuscatedCommand(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    let parsed;
    try {
        parsed = JSON.parse(headContent);
    }
    catch {
        return [];
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
        return [];
    }
    const obj = parsed;
    const sources = [...collectMcpCommandSources(obj), ...collectHookCommandSources(obj)];
    const findings = [];
    for (const source of sources) {
        const pipeMatch = source.text.match(PIPE_TO_SHELL);
        if (pipeMatch) {
            findings.push(buildFinding(filePath, source, 'pipe', pipeMatch[0]));
        }
        const blob = source.text.split(/\s+/).filter(Boolean).find(looksLikeBase64Blob);
        if (blob) {
            findings.push(buildFinding(filePath, source, 'base64', blob));
        }
    }
    return findings;
}

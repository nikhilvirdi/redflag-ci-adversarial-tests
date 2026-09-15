"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectNewMcpServer = detectNewMcpServer;
const correlateRemovedAdded_1 = require("../correlateRemovedAdded");
const unicodeNormalize_1 = require("../unicodeNormalize");
const argsComparison_1 = require("../argsComparison");
// Mirrors DD-2's PINNED_FIELDS (swappedMcpServer.ts) -- what runs (command),
// how it runs (args, env), and any explicit version/hash pin. The field list
// itself is still duplicated rather than imported, since this task is scoped
// to touching only this file and DD-2 doesn't currently export the constant.
// "args" specifically is NOT independently reimplemented, though: both
// detectors compare it through the same shared argsChanged (../argsComparison).
// That extraction closes a real drift this comment used to paper over --
// it previously claimed the two detectors "independently agree on what 'the
// same server' means," which was only true of the field *list*, not the
// comparison itself: DD-2 already ignored a harmless flag reorder here,
// while this file ran the same "args" value through a strict,
// order-sensitive JSON.stringify comparison, so a rename with a
// simultaneous flag reorder in the same diff spuriously read as a brand-new
// server instead of correlating as a rename. Now both truly agree, because
// both call the same function.
const IDENTITY_FIELDS = ['command', 'args', 'version', 'hash', 'env'];
function parseMcpServerEntries(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        const obj = parsed;
        const merged = {};
        // Same merge behavior Task 2.1 fixed on this detector: both
        // "mcpServers" and "servers" are read and merged, "mcpServers" winning
        // on a name collision, a malformed side skipped rather than the whole
        // parse being discarded.
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
// Same server, different key: every identity field matches exactly. "args"
// is compared via the shared argsChanged (../argsComparison, the same logic
// DD-2/swappedMcpServer.ts uses): positional arguments stay order-sensitive
// (a reorder there can change execution semantics, so a rename shouldn't
// silently swallow one underneath it), but flagged/named arguments compare
// as an unordered multiset, since two independent flags being reordered
// relative to each other is cosmetic, not drift -- and must not block a
// correlated rename just because of it. Every other identity field stays a
// strict, order-sensitive JSON.stringify comparison. Both paths go through
// normalizeDeep (Task 5.8) so two otherwise-identical fields expressed in
// different Unicode normalization forms (e.g. an env value or an arg string
// using NFD instead of NFC) still correlate as the same rename, rather than
// spuriously failing to match on byte differences invisible to a human
// reviewer.
function isSameServerDefinition(removed, added) {
    return IDENTITY_FIELDS.every((field) => {
        const removedValue = getField(removed.definition, field);
        const addedValue = getField(added.definition, field);
        return field === 'args'
            ? !(0, argsComparison_1.argsChanged)(removedValue, addedValue)
            : JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(removedValue)) === JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(addedValue));
    });
}
function detectNewMcpServer(filePath, baseContent, headContent) {
    if (headContent === null) {
        return [];
    }
    const headEntries = parseMcpServerEntries(headContent);
    if (!headEntries) {
        return [];
    }
    let baseEntries = {};
    if (baseContent !== null) {
        const parsedBase = parseMcpServerEntries(baseContent);
        if (!parsedBase) {
            return [];
        }
        baseEntries = parsedBase;
    }
    const baseNames = Object.keys(baseEntries);
    const headNames = Object.keys(headEntries);
    // Membership is checked on normalized names (Task 5.8) -- a server key
    // expressed in two different Unicode normalization forms between base and
    // head is the same key to a human reviewer, and must not read as a
    // removal+addition pair. The candidate lists themselves still carry each
    // side's original, un-normalized name (for display and for indexing back
    // into baseEntries/headEntries, which are keyed by the raw JSON text).
    const normalizedBaseNames = new Set(baseNames.map(unicodeNormalize_1.normalizeUnicode));
    const normalizedHeadNames = new Set(headNames.map(unicodeNormalize_1.normalizeUnicode));
    const removedCandidates = baseNames
        .filter((name) => !normalizedHeadNames.has((0, unicodeNormalize_1.normalizeUnicode)(name)))
        .map((name) => ({ name, definition: baseEntries[name] }));
    const addedCandidates = headNames
        .filter((name) => !normalizedBaseNames.has((0, unicodeNormalize_1.normalizeUnicode)(name)))
        .map((name) => ({ name, definition: headEntries[name] }));
    // A removed+added pair whose identity fields match exactly reads as a
    // rename of an already-trusted entry, not a brand-new, unreviewed one
    // (closes the near-miss-mcp-server-rename false positive; see
    // docs/adr/0001-deterministic-only-v1.md). architecture.md section 5's
    // DD-1 spec is silent on renames -- it's written purely in add/remove
    // terms, with no third "renamed" finding type -- so this is a judgment
    // call, made explicitly here: a correlated rename produces NO finding at
    // all, rather than a new, distinct, lower-severity "server renamed"
    // finding. Reasoning: nothing about a rename with byte-identical
    // command/args/version/hash/env is itself risky -- the capability DD-1
    // exists to catch (a new, unreviewed tool entering the config) simply
    // isn't present here, and the near-miss fixture's own documented ground
    // truth is "should stay quiet," not "should report something new." A pair
    // that does NOT match on every identity field is never correlated, so it
    // still reports as a new server below -- same as any add with no removal
    // to correlate against at all. This only ever suppresses a genuinely
    // identical rename; a same-name-different-command swap is DD-2's job, and
    // a same-name-different-args change still reports here as new.
    const { unmatchedAdded } = (0, correlateRemovedAdded_1.correlateRemovedAdded)(removedCandidates, addedCandidates, isSameServerDefinition);
    const findings = [];
    for (const { name: serverName } of unmatchedAdded) {
        findings.push({
            detectorId: 'diff-drift.new-mcp-server',
            severity: 'warning',
            file: filePath,
            summary: `New MCP server '${serverName}' added`,
            detail: `The head branch adds a new MCP server entry '${serverName}' to ${filePath}. Adding new MCP servers widens the tool execution surface area available to AI agents.`,
        });
    }
    return findings;
}

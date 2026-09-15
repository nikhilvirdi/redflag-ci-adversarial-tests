"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSwappedMcpServer = detectSwappedMcpServer;
const unicodeNormalize_1 = require("../unicodeNormalize");
const argsComparison_1 = require("../argsComparison");
// Fields on a single MCP server entry that pin its identity: what runs
// (command), how it runs (args and env), and any explicit version/hash pin.
// A change to any of these on an already-approved entry is the MCPoison
// rug-pull -- an env-var swap (e.g. redirecting a server to a different
// endpoint) is functionally the same risk as a command/args swap.
const PINNED_FIELDS = ['command', 'args', 'version', 'hash', 'env'];
function parseMcpServerEntries(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        const obj = parsed;
        const merged = {};
        // Same merge behavior Task 2.1 fixed on newMcpServer.ts (the same
        // ?? short-circuit bug: an empty-but-present "mcpServers" ({}) is
        // truthy, so it made "servers" invisible entirely, not just when
        // "mcpServers" was absent). Both keys are read and merged, "mcpServers"
        // winning on a genuine name collision, a malformed side skipped rather
        // than the whole parse being discarded.
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
// Order-sensitive comparison: JSON.stringify preserves array order, giving
// exact element-by-element comparison for arrays and plain equality for the
// scalar fields. Used for every pinned field except "args", which instead
// goes through the shared argsChanged (../argsComparison) -- positional CLI
// arguments still need this exact order-sensitive treatment (a reorder
// there can change execution semantics), but named/flagged arguments do
// not, and that split-comparison logic is now the one canonical
// implementation shared with DD-1's rename correlation (newMcpServer.ts),
// not reimplemented per file. Both sides go through normalizeDeep first
// (Task 5.8) so a value that's byte-different only because of its Unicode
// normalization form (e.g. an env value using NFD instead of NFC) doesn't
// read as a swap.
function fieldChanged(a, b) {
    return JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(a)) !== JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(b));
}
function detectSwappedMcpServer(filePath, baseContent, headContent) {
    // DD-2 fires only on modification of an entry present in BOTH versions. If
    // either version is absent, every entry is a pure add or delete, which is
    // not DD-2's concern.
    if (baseContent === null || headContent === null) {
        return [];
    }
    const baseServers = parseMcpServerEntries(baseContent);
    const headServers = parseMcpServerEntries(headContent);
    if (!baseServers || !headServers) {
        return [];
    }
    const findings = [];
    // Keyed by normalized name (Task 5.8), so a server key expressed in a
    // different Unicode normalization form between base and head is still
    // found as "the same server" rather than reading as a pure addition (with
    // no base entry to diff against) that DD-2 silently skips. The map value
    // keeps the raw base definition, not a normalized copy.
    const normalizedBaseServers = new Map(Object.entries(baseServers).map(([name, definition]) => [(0, unicodeNormalize_1.normalizeUnicode)(name), definition]));
    for (const serverName of Object.keys(headServers)) {
        // Present in head but not base => addition (DD-1's job), not a swap.
        if (!normalizedBaseServers.has((0, unicodeNormalize_1.normalizeUnicode)(serverName))) {
            continue;
        }
        const baseEntry = normalizedBaseServers.get((0, unicodeNormalize_1.normalizeUnicode)(serverName));
        const headEntry = headServers[serverName];
        const changedFields = PINNED_FIELDS.filter((field) => {
            const baseValue = getField(baseEntry, field);
            const headValue = getField(headEntry, field);
            return field === 'args' ? (0, argsComparison_1.argsChanged)(baseValue, headValue) : fieldChanged(baseValue, headValue);
        });
        if (changedFields.length > 0) {
            const changed = changedFields.join(', ');
            findings.push({
                detectorId: 'diff-drift.swapped-mcp-server',
                severity: 'high',
                file: filePath,
                summary: `MCP server '${serverName}' definition changed (${changed})`,
                detail: `The already-approved MCP server '${serverName}' in ${filePath} had its ${changed} modified between the base and head branches. Silently repointing a trusted, previously reviewed MCP tool to a different command, argument set, or pinned version is the MCPoison attack pattern (CVE-2025-54136): a rug-pull on an entry that has already passed review, used to achieve persistent remote code execution.`,
            });
        }
    }
    return findings;
}

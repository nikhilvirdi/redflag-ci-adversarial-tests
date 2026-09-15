"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectTransportTypeChange = detectTransportTypeChange;
const unicodeNormalize_1 = require("../unicodeNormalize");
// Mirrors DD-2's own parseMcpServerEntries/getField exactly (swappedMcpServer.ts):
// both "mcpServers" and "servers" are read and merged, "mcpServers" winning
// on a name collision, a malformed side skipped rather than the whole parse
// being discarded -- duplicated locally rather than imported since this task
// is scoped to touching only this file. (Previously used `mcpServers ??
// servers`, the same short-circuit bug Task 2.1 fixed on DD-1: an
// empty-but-present "mcpServers" is truthy, so it made "servers" invisible
// entirely, not just when "mcpServers" was absent.)
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
// "Local" (stdio) shape: a "command" to execute, and neither a "url" nor a
// "transport" field. "Remote" (SSE/HTTP) shape: a "url" and/or a "transport"
// field, and no "command". An entry matching neither shape cleanly -- both
// fields present, or neither -- is a hybrid/malformed shape this detector
// deliberately does not guess at; only an unambiguous flip from one clean
// shape to the other counts as a transport-type change.
function isLocalShape(entry) {
    return (typeof getField(entry, 'command') === 'string' &&
        getField(entry, 'url') === undefined &&
        getField(entry, 'transport') === undefined);
}
function isRemoteShape(entry) {
    const hasUrl = typeof getField(entry, 'url') === 'string';
    const hasTransport = getField(entry, 'transport') !== undefined;
    return (hasUrl || hasTransport) && getField(entry, 'command') === undefined;
}
// DD-7: local<->remote MCP transport-type change. A diff check (base+head),
// unlike Tasks 5.1-5.6's current-state checks -- "changed transport" is
// inherently a before/after comparison, not a property of head alone.
//
// Both directions are flagged, at the same HIGH severity, not just
// local-to-remote: architecture.md 8's roadmap line names "local-to-remote"
// as the headline case (a previously-reviewed local tool silently starts
// sending its I/O to a network endpoint outside your control -- the same
// exfiltration-shaped risk DD-2/MCPoison exists to catch), but a
// remote-to-local swap is an equally real trust-boundary jump in the other
// direction: a server that used to be a network call becomes a command that
// executes directly, with full local privileges, on whatever machine runs
// the agent. Both are "the fundamental nature of how this server executes
// changed" -- the reviewer needs to know which one happened, not just that
// *something* about the entry changed generically (which DD-2's
// command-field comparison may already report, but only as an undifferentiated
// "command changed", not "this now runs somewhere else entirely").
function detectTransportTypeChange(filePath, baseContent, headContent) {
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
    // found as "the same server" rather than reading as a pure addition with
    // no base entry to compare its transport shape against.
    const normalizedBaseServers = new Map(Object.entries(baseServers).map(([name, definition]) => [(0, unicodeNormalize_1.normalizeUnicode)(name), definition]));
    for (const serverName of Object.keys(headServers)) {
        // Present in head but not base => addition (DD-1's job), not a swap.
        if (!normalizedBaseServers.has((0, unicodeNormalize_1.normalizeUnicode)(serverName))) {
            continue;
        }
        const baseEntry = normalizedBaseServers.get((0, unicodeNormalize_1.normalizeUnicode)(serverName));
        const headEntry = headServers[serverName];
        let fromDesc = null;
        let toDesc = null;
        if (isLocalShape(baseEntry) && isRemoteShape(headEntry)) {
            fromDesc = 'local (command-based, stdio)';
            toDesc = 'remote (url/transport-based)';
        }
        else if (isRemoteShape(baseEntry) && isLocalShape(headEntry)) {
            fromDesc = 'remote (url/transport-based)';
            toDesc = 'local (command-based, stdio)';
        }
        if (fromDesc && toDesc) {
            findings.push({
                detectorId: 'diff-drift.transport-type-change',
                severity: 'high',
                file: filePath,
                summary: `MCP server '${serverName}' transport changed from ${fromDesc} to ${toDesc}`,
                detail: `The MCP server '${serverName}' in ${filePath} changed from ${fromDesc} to ${toDesc} between the base and head branches. This is a trust-boundary jump independent of any single field's value: a locally-run process executes with local privileges and is visible in this repo, while a remote endpoint executes outside your control and receives whatever the agent sends it -- swapping between the two, in either direction, silently changes what an already-approved server actually does.`,
            });
        }
    }
    return findings;
}

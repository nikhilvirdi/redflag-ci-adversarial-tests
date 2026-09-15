"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectRuleFileChecksInJsonKeys = detectRuleFileChecksInJsonKeys;
const invisibleUnicode_1 = require("./invisibleUnicode");
const homoglyphs_1 = require("./homoglyphs");
// Mirrors DD-1/unpinnedMcpDependency's own parseMcpServerEntries: both
// "mcpServers" and "servers" are read and merged -- duplicated locally
// rather than imported since this task (5.3) is scoped to touching only
// dispatch, and DD-1 doesn't currently export it. Only the key names are
// needed here, not the definitions, so this returns names directly rather
// than the merged object DD-1/DD-2 build.
function mcpServerNames(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return [];
        }
        const obj = parsed;
        const names = new Set();
        for (const candidate of [obj.servers, obj.mcpServers]) {
            if (candidate && typeof candidate === 'object' && !Array.isArray(candidate)) {
                for (const name of Object.keys(candidate)) {
                    names.add(name);
                }
            }
        }
        return [...names];
    }
    catch {
        return [];
    }
}
// Mirrors DD-3's own parsePermissions -- duplicated locally for the same
// reason as mcpServerNames above. Only the entry strings themselves are
// needed here, not the base/head diff DD-3 computes.
function permissionEntries(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return [];
        }
        const obj = parsed;
        const permissions = obj.permissions;
        if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
            return [];
        }
        const permObj = permissions;
        const entries = [];
        for (const field of ['allow', 'deny']) {
            const value = permObj[field];
            if (Array.isArray(value)) {
                entries.push(...value.filter((v) => typeof v === 'string'));
            }
        }
        return entries;
    }
    catch {
        return [];
    }
}
// Task 5.3: RF-1 (invisible Unicode) and RF-2 (homoglyphs) originally only
// scanned rule-file prose (CLAUDE.md, .cursor/rules/*, copilot-instructions.md).
// This extends their reach to the identifier-like JSON strings a human
// reviewer skims past in diff-drift files -- MCP server names and permission
// entries -- without touching either detector's own character-matching logic
// (architecture.md 4/5): each extracted string is just handed to the existing
// detectInvisibleUnicode/detectHomoglyphs functions unchanged. Current-state
// check only, matching RF-1/RF-2's own head-only behavior -- there's no
// "renamed server" or "changed permission" concept here, just "does this
// string, as it stands in head, contain a hidden character."
//
// A finding's line/column reflects an offset into the isolated key/entry
// string passed to the detector, not a real position in the JSON file --
// there is no line number for a bare object key or array entry to report,
// so this is left as the detectors' existing single-string behavior rather
// than threading real file positions through them.
function detectRuleFileChecksInJsonKeys(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    const targets = [...mcpServerNames(headContent), ...permissionEntries(headContent)];
    const findings = [];
    for (const target of targets) {
        findings.push(...(0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, target));
        findings.push(...(0, homoglyphs_1.detectHomoglyphs)(filePath, target));
    }
    return findings;
}

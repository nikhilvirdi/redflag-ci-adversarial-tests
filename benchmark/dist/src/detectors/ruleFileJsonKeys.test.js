"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const ruleFileJsonKeys_1 = require("./ruleFileJsonKeys");
const homoglyphs_1 = require("./homoglyphs");
describe('Task 5.3: RF-1/RF-2 extended to JSON config keys', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'rf-json-keys');
    const readFixture = (name, file) => fs.readFileSync(path.join(fixturesDir, name, file), 'utf-8');
    it('fires a homoglyph finding when an MCP server name contains a look-alike character (fixture)', () => {
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.mcp.json', readFixture('homoglyph-mcp-server-name', 'mcp.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.homoglyph');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe('.mcp.json');
        expect(findings[0].summary).toBe('Cyrillic look-alike character (U+0430) found');
        expect(findings[0].detail).toContain("visually identical to Latin 'a'");
    });
    it('does NOT fire on a clean MCP server name using only standard Latin characters (fixture)', () => {
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.mcp.json', readFixture('clean-mcp-server-name', 'mcp.json'));
        expect(findings).toHaveLength(0);
    });
    it('fires an invisible-Unicode finding when a permission entry contains a hidden character (fixture)', () => {
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.claude/settings.json', readFixture('invisible-permission-entry', 'settings.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe('.claude/settings.json');
        expect(findings[0].summary).toBe('Invisible Unicode character (U+200B) found');
        expect(findings[0].detail).toContain('zero-width space');
    });
    it('does NOT fire on clean permission entries using only standard characters (fixture)', () => {
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.claude/settings.json', readFixture('clean-permission-entry', 'settings.json'));
        expect(findings).toHaveLength(0);
    });
    it('returns zero findings when headContent is null (file deleted in head)', () => {
        expect((0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.mcp.json', null)).toHaveLength(0);
    });
    it('returns zero findings for malformed JSON', () => {
        expect((0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.mcp.json', '{not valid json')).toHaveLength(0);
    });
    it('returns zero findings for a file with neither mcpServers/servers nor permissions', () => {
        expect((0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.claude/settings.json', JSON.stringify({ hooks: {} }))).toHaveLength(0);
    });
    it('scans both "servers" and "mcpServers" keys for homoglyphs', () => {
        const content = JSON.stringify({
            servers: { 'slаck': { command: 'npx' } },
        });
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.cursor/mcp.json', content);
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.homoglyph');
    });
    it('scans deny-list entries, not just allow-list entries', () => {
        const content = JSON.stringify({
            permissions: { allow: [], deny: ['Bash(rm -rf /)​'] },
        });
        const findings = (0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.claude/settings.json', content);
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
    });
    // Stress-test finding (backend/STRESS_TEST_FINDINGS.md, EXT-E4): documents
    // a real, currently-open COMPOUND gap rather than fixing it -- two
    // independent, each-individually-in-scope facts combine into a concrete
    // evasion:
    //   1. permissionEntries() only ever reads the literal `permissions.allow`
    //      and `permissions.deny` fields -- it never enumerates the
    //      `permissions` object's own key set, so a fabricated SIBLING key
    //      (not a value inside allow/deny) is never even handed to
    //      detectHomoglyphs/detectInvisibleUnicode in the first place. This
    //      matches architecture.md 5's stated scope for the JSON-key extension
    //      ("permission allow/deny entries," not "permission object key
    //      names"), so this half is working as documented, not a surprise.
    //   2. Independently, the specific code points used below (Mathematical
    //      BOLD FRAKTUR, U+1D586 range) aren't in HOMOGLYPHS at all -- only
    //      plain Mathematical Bold (U+1D400-1D433) is covered. Confirmed via
    //      detectHomoglyphs called directly on the fabricated string, below,
    //      independent of ruleFileJsonKeys' own scanning-scope limitation.
    // Together: a sibling key like "\u{1D586}\u{1D591}\u{1D591}\u{1D594}\u{1D59C}"
    // (Bold Fraktur "allow", visually near-identical to the real "allow" key)
    // sitting next to a real "allow" key in the same permissions object is
    // completely invisible to this pipeline today, for two separate reasons
    // at once.
    it('known-gap: does NOT scan a fabricated sibling permissions-object KEY, and the confusables table does not cover Mathematical Bold Fraktur either', () => {
        const fakeKey = '\u{1D586}\u{1D591}\u{1D591}\u{1D594}\u{1D59C}'; // Bold Fraktur "allow"
        const content = JSON.stringify({
            permissions: { allow: ['read'], deny: [], [fakeKey]: ['read', 'write:**'] },
        });
        expect((0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)('.claude/settings.json', content)).toHaveLength(0);
        // Isolates cause #2: even called directly on the bare string, outside
        // ruleFileJsonKeys' own scanning-scope limitation, the table itself
        // doesn't recognize these code points as homoglyphs.
        expect((0, homoglyphs_1.detectHomoglyphs)('.claude/settings.json', fakeKey)).toHaveLength(0);
    });
});

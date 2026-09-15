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
const duplicateJsonKey_1 = require("./duplicateJsonKey");
describe('Task 5.4: detectDuplicateJsonKey', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'duplicate-json-key');
    const readFixture = (name, file) => fs.readFileSync(path.join(fixturesDir, name, file), 'utf-8');
    it('fires a WARNING-severity finding when a top-level key is duplicated (fixture)', () => {
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', readFixture('duplicate-mcp-servers-key', '.mcp.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.duplicate-json-key',
            severity: 'warning',
            file: '.mcp.json',
            summary: "Duplicate top-level key 'mcpServers' found",
            detail: "The top-level key 'mcpServers' appears more than once in .mcp.json. Some JSON parsers " +
                'silently resolve a duplicate key to its last occurrence while others take the first, so ' +
                'a second occurrence can smuggle a payload past a reviewer who only reads the first, ' +
                'legitimate-looking one.',
        });
    });
    it('produces zero findings when every top-level key appears once (fixture)', () => {
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', readFixture('single-key', '.mcp.json'));
        expect(findings).toHaveLength(0);
    });
    it('fires on a duplicated top-level key in .claude/settings.json (fixture)', () => {
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.claude/settings.json', readFixture('duplicate-permissions-key', 'settings.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("Duplicate top-level key 'permissions' found");
        expect(findings[0].file).toBe('.claude/settings.json');
    });
    it('does NOT flag the same key name repeated at a nested depth, only at top level (fixture)', () => {
        // Two different servers each having their own "command" key is fine --
        // those are at depth 3 (mcpServers -> server -> command), not depth 1.
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', readFixture('nested-same-key-not-duplicate', '.mcp.json'));
        expect(findings).toHaveLength(0);
    });
    it('produces zero findings when headContent is null (file deleted in head)', () => {
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', null)).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when headContent is malformed JSON', () => {
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', '{ invalid json')).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when content is valid JSON primitive or array', () => {
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', '[1, 2, 3]')).toHaveLength(0);
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', '"hello"')).toHaveLength(0);
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', '123')).toHaveLength(0);
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', 'null')).toHaveLength(0);
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', '')).toHaveLength(0);
    });
    it('reports one finding per duplicated key name, even with three or more occurrences', () => {
        const headContent = '{"a": 1, "b": 2, "a": 3, "a": 4}';
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("Duplicate top-level key 'a' found");
    });
    it('reports a separate finding for each distinct duplicated key', () => {
        const headContent = '{"mcpServers": {}, "hooks": {}, "mcpServers": {}, "hooks": {}}';
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', headContent);
        expect(findings).toHaveLength(2);
        const summaries = findings.map((f) => f.summary).sort();
        expect(summaries).toEqual([
            "Duplicate top-level key 'hooks' found",
            "Duplicate top-level key 'mcpServers' found",
        ]);
    });
    it('is unaffected by whitespace/minification (whitespace-agnostic raw scan)', () => {
        const minified = '{"mcpServers":{"a":{"command":"npx"}},"mcpServers":{"b":{"command":"npx"}}}';
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', minified)).toHaveLength(1);
    });
    it('does not miscount depth when a string value contains braces, brackets, or a colon', () => {
        const headContent = JSON.stringify({
            mcpServers: { a: { command: 'npx', args: ['{not: a real key}', '[also not]'] } },
            note: 'a string with a colon: right here, and {braces} too',
        });
        expect((0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('supports "servers" top-level key as well as "mcpServers"', () => {
        const headContent = '{"servers": {"a": {}}, "servers": {"b": {}}}';
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('claude_desktop_config.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("Duplicate top-level key 'servers' found");
        expect(findings[0].file).toBe('claude_desktop_config.json');
    });
    it('Task 5.8: fires when the same top-level key appears twice, once in each Unicode normalization form (fixture)', () => {
        // The fixture's two non-"mcpServers" keys are the same logical name --
        // one NFD (decomposed), one NFC (precomposed) -- byte-different but
        // visually identical to a reviewer skimming the file.
        const findings = (0, duplicateJsonKey_1.detectDuplicateJsonKey)('.mcp.json', readFixture('nfc-nfd-duplicate', '.mcp.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('diff-drift.duplicate-json-key');
    });
});

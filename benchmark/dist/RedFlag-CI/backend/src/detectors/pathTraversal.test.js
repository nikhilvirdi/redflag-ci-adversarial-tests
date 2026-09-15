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
const pathTraversal_1 = require("./pathTraversal");
describe('Task 5.6: detectPathTraversal', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'path-traversal');
    const filePath = '.mcp.json';
    const readFixture = (name) => fs.readFileSync(path.join(fixturesDir, name, '.mcp.json'), 'utf-8');
    it('fires a WARNING-severity finding for path traversal in args (fixture)', () => {
        const findings = (0, pathTraversal_1.detectPathTraversal)(filePath, readFixture('args-traversal'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.path-traversal',
            severity: 'warning',
            file: filePath,
            summary: "MCP server 'file-reader' uses path traversal sequence in '../../etc/passwd'",
            detail: "The MCP server 'file-reader' in .mcp.json configures path traversal sequence " +
                "'../../etc/passwd'. Navigating outside expected directory boundaries using relative " +
                "path sequences ('../' or '..\\') can expose sensitive system files or escape directory sandboxing.",
        });
    });
    it('fires a WARNING-severity finding for path traversal in env (fixture)', () => {
        const findings = (0, pathTraversal_1.detectPathTraversal)(filePath, readFixture('env-traversal'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.path-traversal',
            severity: 'warning',
            file: filePath,
            summary: "MCP server 'file-reader' uses path traversal sequence in '../secrets/key.pem'",
            detail: "The MCP server 'file-reader' in .mcp.json configures path traversal sequence " +
                "'../secrets/key.pem'. Navigating outside expected directory boundaries using relative " +
                "path sequences ('../' or '..\\') can expose sensitive system files or escape directory sandboxing.",
        });
    });
    it('produces zero findings for a benign relative path (fixture)', () => {
        const findings = (0, pathTraversal_1.detectPathTraversal)(filePath, readFixture('benign'));
        expect(findings).toHaveLength(0);
    });
    it('is a current-state check: fires on head content alone with no base argument', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['../config.json'] },
            },
        });
        const findings = (0, pathTraversal_1.detectPathTraversal)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
    });
    it('detects Windows-style path traversal (..\\) in args or env', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                winServer: { command: 'node', env: { PATH: '..\\Windows\\System32\\config' } },
            },
        });
        const findings = (0, pathTraversal_1.detectPathTraversal)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'winServer' uses path traversal sequence in '..\\Windows\\System32\\config'");
    });
    it('does not fire on double-dots without path separators (e.g. revspecs main..head or ranges 1..10)', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                gitTool: { command: 'git', args: ['diff', 'main..feature'] },
                rangeTool: { command: 'node', args: ['--range=1..100'] },
            },
        });
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('detects multiple path traversal sequences across different servers', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                a: { command: 'node', args: ['../a.json'] },
                b: { command: 'node', args: ['./b.json'] },
                c: { command: 'node', env: { FILE: '../../c.json' } },
            },
        });
        const findings = (0, pathTraversal_1.detectPathTraversal)('.mcp.json', headContent);
        expect(findings).toHaveLength(2);
        const summaries = findings.map((f) => f.summary);
        expect(summaries).toContain("MCP server 'a' uses path traversal sequence in '../a.json'");
        expect(summaries).toContain("MCP server 'c' uses path traversal sequence in '../../c.json'");
    });
    it('produces zero findings when headContent is null (file deleted in head)', () => {
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', null)).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when headContent is malformed JSON', () => {
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', '{ invalid json')).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when content is valid JSON primitive or array', () => {
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', '[1, 2, 3]')).toHaveLength(0);
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', '"hello"')).toHaveLength(0);
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', '123')).toHaveLength(0);
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', 'null')).toHaveLength(0);
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', '')).toHaveLength(0);
    });
    it('supports "servers" top-level key as well as "mcpServers"', () => {
        const headContent = JSON.stringify({
            servers: {
                api: { command: 'node', args: ['../secret/path'] },
            },
        });
        const findings = (0, pathTraversal_1.detectPathTraversal)('claude_desktop_config.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].file).toBe('claude_desktop_config.json');
    });
    // Closes the fullwidth-separator gap from redflag-ci-adversarial-tests/STRESS_TEST_FINDINGS.md,
    // INT-A1: a fullwidth solidus (U+FF0F, "／") renders as a visually
    // near-identical slash but is a different code point than ASCII "/", so
    // "..／etc／passwd" walks the same directories a reviewer would read as
    // "../etc/passwd". PATH_TRAVERSAL_REGEX now matches both fullwidth
    // separators alongside the ASCII ones, the same Unicode-confusable
    // awareness RF-1/RF-2 already apply elsewhere.
    it('detects the fullwidth solidus (U+FF0F) and fullwidth reverse solidus (U+FF3C) standing in for the ASCII path separators', () => {
        const fullwidthSolidus = JSON.stringify({
            mcpServers: { fs: { command: 'node', args: ['..／etc／passwd'] } },
        });
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', fullwidthSolidus)).toHaveLength(1);
        const fullwidthReverseSolidus = JSON.stringify({
            mcpServers: { fs: { command: 'node', args: ['..＼etc＼passwd'] } },
        });
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', fullwidthReverseSolidus)).toHaveLength(1);
        // Control: the ASCII version is still caught, unaffected by the addition.
        const asciiEquivalent = JSON.stringify({
            mcpServers: { fs: { command: 'node', args: ['../etc/passwd'] } },
        });
        expect((0, pathTraversal_1.detectPathTraversal)('.mcp.json', asciiEquivalent)).toHaveLength(1);
    });
});

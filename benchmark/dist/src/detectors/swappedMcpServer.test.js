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
const swappedMcpServer_1 = require("./swappedMcpServer");
describe('DD-2: detectSwappedMcpServer', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'dd2');
    const readFixture = (name, file) => fs.readFileSync(path.join(fixturesDir, name, file), 'utf-8');
    it('produces a high-severity finding for the MCPoison pattern: same server name, changed command (fixture)', () => {
        const beforeContent = readFixture('command-swap', 'before.json');
        const afterContent = readFixture('command-swap', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        // Only the 'fetch' entry changed; the identical 'filesystem' entry must not fire.
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.swapped-mcp-server',
            severity: 'high',
            file: '.mcp.json',
            summary: "MCP server 'fetch' definition changed (command)",
            detail: "The already-approved MCP server 'fetch' in .mcp.json had its command modified " +
                'between the base and head branches. Silently repointing a trusted, previously ' +
                'reviewed MCP tool to a different command, argument set, or pinned version is the ' +
                'MCPoison attack pattern (CVE-2025-54136): a rug-pull on an entry that has already ' +
                'passed review, used to achieve persistent remote code execution.',
        });
    });
    it('produces zero findings when no server entry changed (fixture)', () => {
        const beforeContent = readFixture('no-change', 'before.json');
        const afterContent = readFixture('no-change', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(0);
    });
    it("produces a high-severity finding when only args change (spec's 'arguments') (fixture)", () => {
        const beforeContent = readFixture('args-swap', 'before.json');
        const afterContent = readFixture('args-swap', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe("MCP server 'filesystem' definition changed (args)");
    });
    it('does NOT fire on a newly added server (that is DD-1, not DD-2)', () => {
        const beforeContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'node' }, s2: { command: 'python' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(0);
    });
    it('does NOT fire on a removed server (present in base, absent in head)', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'node' }, s2: { command: 'python' } },
        });
        const afterContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(0);
    });
    it('fires when a pinned version field changes on an existing entry', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { db: { command: 'node', version: '1.2.3' } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { db: { command: 'node', version: '9.9.9' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'db' definition changed (version)");
    });
    it('fires when a pinned hash field changes on an existing entry', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { db: { command: 'node', hash: 'sha256:aaa' } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { db: { command: 'node', hash: 'sha256:bbb' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'db' definition changed (hash)");
    });
    it('reports every changed pinned field for a single entry', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['a'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'node', args: ['b'] } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (command, args)");
    });
    it('treats args comparison as order-sensitive for purely positional arguments', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['-y', 'pkg', '/tmp'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['-y', '/tmp', 'pkg'] } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (args)");
    });
    it('produces zero findings when only flagged arguments are reordered (fixture)', () => {
        // Closes the near-miss-args-reorder false positive: "-y" (positional,
        // single-dash) stays last-before-the-package-name in both orderings;
        // only "--verbose" (a flagged argument) moves relative to it, which is
        // cosmetic, not drift.
        const beforeContent = readFixture('args-reorder-flags-only', 'before.json');
        const afterContent = readFixture('args-reorder-flags-only', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(0);
    });
    it('still fires when a positional flag value moves before its flag (fixture)', () => {
        // judgment-dd2-args-reorder-with-real-semantics: "--config" goes from
        // immediately followed by "/etc/app.conf" (has a value) to immediately
        // followed by "--verbose" (no value at all) -- a genuine argument-parsing
        // break, not a cosmetic reorder. Must keep firing after this task.
        const beforeContent = readFixture('args-reorder-real-semantics', 'before.json');
        const afterContent = readFixture('args-reorder-real-semantics', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'deploy' definition changed (args)");
    });
    it('compares self-contained "--key=value" flagged arguments unordered', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['pkg', '--timeout=30', '--retries=3'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['pkg', '--retries=3', '--timeout=30'] } },
        });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent)).toHaveLength(0);
    });
    it('still fires when a flagged argument value actually changes, reorder aside', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['pkg', '--timeout=30'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['--timeout=90', 'pkg'] } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (args)");
    });
    it('still fires when a flagged argument is genuinely added, not just reordered', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['-y', 'pkg'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['-y', 'pkg', '--allow-write'] } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (args)");
    });
    it('falls back to exact comparison when args is not a clean string array', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['-y', 42, 'pkg'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'npx', args: ['pkg', 42, '-y'] } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (args)");
    });
    it('fires when a pinned field is removed from an existing entry', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'node', args: ['server.js'] } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'node' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (args)");
    });
    it('supports the "servers" top-level key as well as "mcpServers"', () => {
        const beforeContent = JSON.stringify({ servers: { s1: { command: 'node' } } });
        const afterContent = JSON.stringify({ servers: { s1: { command: 'python' } } });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('claude_desktop_config.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
    });
    it('merges "mcpServers" and "servers" instead of the first present short-circuiting the other (fixture)', () => {
        // Task 6.4: the same ?? short-circuit bug Task 2.1 fixed on
        // newMcpServer.ts, re-surfaced here: an empty-but-present "mcpServers"
        // ({}) is truthy, so `mcpServers ?? servers` picked it and made
        // "servers" invisible entirely -- not just when "mcpServers" was
        // absent. A command/args swap on a "servers"-only entry was silently
        // missed as a result.
        const beforeContent = readFixture('both-schema-keys-present', 'before.json');
        const afterContent = readFixture('both-schema-keys-present', 'after.json');
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'filesystem' definition changed (args)");
    });
    it('still reads "servers" when "mcpServers" is present but malformed (not an object)', () => {
        const beforeContent = JSON.stringify({
            mcpServers: 'not-an-object',
            servers: { s1: { command: 'node' } },
        });
        const afterContent = JSON.stringify({
            mcpServers: 'not-an-object',
            servers: { s1: { command: 'python' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 's1' definition changed (command)");
    });
    it('lets "mcpServers" win over "servers" on a genuine name collision, suppressing a change made only on the "servers" side', () => {
        const beforeContent = JSON.stringify({
            mcpServers: { s1: { command: 'trusted' } },
            servers: { s1: { command: 'shadow-before' } },
        });
        const afterContent = JSON.stringify({
            mcpServers: { s1: { command: 'trusted' } },
            servers: { s1: { command: 'shadow-after' } },
        });
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, afterContent);
        expect(findings).toHaveLength(0);
    });
    it('returns zero findings when base is null (newly added file: all entries are adds)', () => {
        const afterContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', null, afterContent)).toHaveLength(0);
    });
    it('returns zero findings when head is null (file deleted)', () => {
        const beforeContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, null)).toHaveLength(0);
    });
    it('fails open (zero findings) when base content is malformed JSON', () => {
        const afterContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', '{ malformed', afterContent)).toHaveLength(0);
    });
    it('fails open (zero findings) when head content is malformed JSON', () => {
        const beforeContent = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', beforeContent, '{ malformed')).toHaveLength(0);
    });
    it('fails open (zero findings) when content is a valid JSON primitive or array', () => {
        const valid = JSON.stringify({ mcpServers: { s1: { command: 'node' } } });
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', valid, '[1, 2, 3]')).toHaveLength(0);
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', '"hello"', valid)).toHaveLength(0);
        expect((0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', valid, '123')).toHaveLength(0);
    });
    it('Task 5.8: still finds the base entry and detects a real command swap when the key is expressed in a different Unicode normalization form (fixture)', () => {
        // before.json's key is NFD; after.json's is the NFC form of the same
        // logical key, AND the command genuinely changes -- proves the base
        // entry is still looked up correctly (not silently treated as a
        // same-name addition with nothing to diff against), not just that
        // "nothing changed" trivially produces no finding.
        const findings = (0, swappedMcpServer_1.detectSwappedMcpServer)('.mcp.json', readFixture('nfc-nfd-key-still-detects-swap', 'before.json'), readFixture('nfc-nfd-key-still-detects-swap', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('diff-drift.swapped-mcp-server');
        expect(findings[0].summary).toContain('definition changed (command)');
    });
    // Task 6.5's splitArgs byte-construction regression coverage moved to
    // argsComparison.test.ts alongside the function itself, once this task
    // extracted splitArgs/argsChanged out of this file into the shared
    // ../argsComparison module. Leaving that coverage here would have left it
    // checking the wrong source file for the embedded-NUL-byte regression it
    // exists to catch, since the template literal it guards no longer lives
    // in swappedMcpServer.ts.
});

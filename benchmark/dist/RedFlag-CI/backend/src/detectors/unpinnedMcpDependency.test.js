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
const unpinnedMcpDependency_1 = require("./unpinnedMcpDependency");
describe('Task 5.1: detectUnpinnedMcpDependency', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'unpinned-mcp-dependency');
    const filePath = '.mcp.json';
    const readFixture = (name) => fs.readFileSync(path.join(fixturesDir, name, '.mcp.json'), 'utf-8');
    it('fires a WARNING-severity finding for an npx server with no version pin (fixture)', () => {
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('unpinned'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.unpinned-mcp-dependency',
            severity: 'warning',
            file: filePath,
            summary: "MCP server 'fetch' installs 'mcp-server-fetch' via npx with no version pin",
            detail: "The MCP server 'fetch' in .mcp.json runs 'mcp-server-fetch' via npx with no pinned " +
                "version. Without an explicit version (e.g. 'mcp-server-fetch@1.2.3'), npx always " +
                'resolves to whatever release is currently published on the registry, so a compromised ' +
                'or malicious package update reaches every agent invocation immediately, with no PR for ' +
                'anyone to review.',
        });
    });
    it('produces zero findings when the same npx server is pinned to a version (fixture)', () => {
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('pinned'));
        expect(findings).toHaveLength(0);
    });
    it('produces zero findings for a benign config: one pinned npx server, one non-npx server (fixture)', () => {
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('benign'));
        expect(findings).toHaveLength(0);
    });
    it('is a current-state check: an unpinned server already present in head still fires with no base argument', () => {
        const headContent = JSON.stringify({
            mcpServers: { fetch: { command: 'npx', args: ['mcp-server-fetch'] } },
        });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
    });
    it('does not fire on a non-npx command (out of scope)', () => {
        const headContent = JSON.stringify({
            mcpServers: { fetch: { command: 'uvx', args: ['mcp-server-fetch'] } },
        });
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('treats a scoped package with no version as unpinned', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                filesystem: { command: 'npx', args: ['-y', '@modelcontextprotocol/server-filesystem'] },
            },
        });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'filesystem' installs '@modelcontextprotocol/server-filesystem' via npx with no version pin");
    });
    it('treats a scoped package with a version pin as pinned (scope "@" is not mistaken for a version marker)', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                filesystem: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem@1.0.4'],
                },
            },
        });
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('detects multiple unpinned servers in the same file', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                a: { command: 'npx', args: ['pkg-a'] },
                b: { command: 'npx', args: ['pkg-b@1.0.0'] },
                c: { command: 'npx', args: ['-y', 'pkg-c'] },
            },
        });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
        expect(findings).toHaveLength(2);
        const summaries = findings.map((f) => f.summary);
        expect(summaries).toContain("MCP server 'a' installs 'pkg-a' via npx with no version pin");
        expect(summaries).toContain("MCP server 'c' installs 'pkg-c' via npx with no version pin");
    });
    it('produces zero findings when headContent is null (file deleted in head)', () => {
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', null)).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when headContent is malformed JSON', () => {
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', '{ malformed json')).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when content is valid JSON primitive or array', () => {
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', '[1, 2, 3]')).toHaveLength(0);
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', '"hello"')).toHaveLength(0);
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', '123')).toHaveLength(0);
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', 'null')).toHaveLength(0);
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', '')).toHaveLength(0);
    });
    it('produces zero findings when an npx server has no args at all', () => {
        const headContent = JSON.stringify({ mcpServers: { fetch: { command: 'npx' } } });
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('produces zero findings when npx args are only flags (no identifiable package)', () => {
        const headContent = JSON.stringify({ mcpServers: { fetch: { command: 'npx', args: ['-y'] } } });
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
    });
    // Regression: isPinnedPackageSpec previously accepted any "@something" as a
    // pin, including a floating dist-tag that resolves to whatever the
    // registry currently marks it as -- the same non-deterministic resolution
    // as no pin at all. "npx malicious-package@latest" read as pinned.
    it.each(['latest', 'next', 'canary', 'beta'])('treats a floating dist-tag ("@%s") as unpinned, not a real pin', (tag) => {
        const headContent = JSON.stringify({
            mcpServers: { fetch: { command: 'npx', args: [`mcp-server-fetch@${tag}`] } },
        });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe(`MCP server 'fetch' installs 'mcp-server-fetch@${tag}' via npx with no version pin`);
    });
    it('still treats a real semver version as pinned (not swept up by the dist-tag rejection)', () => {
        const headContent = JSON.stringify({
            mcpServers: { fetch: { command: 'npx', args: ['mcp-server-fetch@1.2.3'] } },
        });
        expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('treats a scoped package pinned to a floating dist-tag as unpinned', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                filesystem: {
                    command: 'npx',
                    args: ['-y', '@modelcontextprotocol/server-filesystem@latest'],
                },
            },
        });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'filesystem' installs '@modelcontextprotocol/server-filesystem@latest' via npx with no version pin");
    });
    it('supports "servers" top-level key as well as "mcpServers"', () => {
        const headContent = JSON.stringify({ servers: { fetch: { command: 'npx', args: ['pkg'] } } });
        const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('claude_desktop_config.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].file).toBe('claude_desktop_config.json');
    });
    // ---------------------------------------------------------------------------
    // Additional floating-dependency runners (Task 5.1 extension)
    // ---------------------------------------------------------------------------
    describe('npx.cmd (Windows alias)', () => {
        it('fires a WARNING finding for npx.cmd with an unpinned package (fixture)', () => {
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('npx-cmd-unpinned'));
            expect(findings).toHaveLength(1);
            expect(findings[0]).toEqual({
                detectorId: 'diff-drift.unpinned-mcp-dependency',
                severity: 'warning',
                file: filePath,
                summary: "MCP server 'fetch' installs 'mcp-server-fetch' via npx.cmd with no version pin",
                detail: "The MCP server 'fetch' in .mcp.json runs 'mcp-server-fetch' via npx.cmd with no pinned " +
                    "version. Without an explicit version (e.g. 'mcp-server-fetch@1.2.3'), npx.cmd always " +
                    'resolves to whatever release is currently published on the registry, so a compromised ' +
                    'or malicious package update reaches every agent invocation immediately, with no PR for ' +
                    'anyone to review.',
            });
        });
        it('produces zero findings when npx.cmd server is pinned (fixture)', () => {
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('npx-cmd-pinned'))).toHaveLength(0);
        });
        it('fires for an unpinned npx.cmd server given inline', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'npx.cmd', args: ['mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via npx.cmd with no version pin");
        });
        it('produces zero findings when npx.cmd package is pinned (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'npx.cmd', args: ['mcp-server-fetch@1.2.3'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
    });
    describe('absolute path to npx / npx.cmd', () => {
        it('fires a WARNING finding for an absolute Unix path to npx with an unpinned package (fixture)', () => {
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('npx-abs-path-unpinned'));
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via npx with no version pin");
        });
        it('fires for /usr/local/bin/npx with unpinned package (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: '/usr/local/bin/npx', args: ['mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via npx with no version pin");
        });
        it('produces zero findings for /usr/local/bin/npx with a pinned package', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: '/usr/local/bin/npx', args: ['mcp-server-fetch@2.0.0'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('fires for a Windows absolute path to npx.cmd with an unpinned package (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    fetch: {
                        command: 'C:\\Users\\user\\AppData\\Roaming\\npm\\npx.cmd',
                        args: ['mcp-server-fetch'],
                    },
                },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via npx.cmd with no version pin");
        });
    });
    describe('pnpm dlx', () => {
        it('fires a WARNING finding for pnpm dlx with an unpinned package (fixture)', () => {
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('pnpm-dlx-unpinned'));
            expect(findings).toHaveLength(1);
            expect(findings[0]).toEqual({
                detectorId: 'diff-drift.unpinned-mcp-dependency',
                severity: 'warning',
                file: filePath,
                summary: "MCP server 'fetch' installs 'mcp-server-fetch' via pnpm dlx with no version pin",
                detail: "The MCP server 'fetch' in .mcp.json runs 'mcp-server-fetch' via pnpm dlx with no pinned " +
                    "version. Without an explicit version (e.g. 'mcp-server-fetch@1.2.3'), pnpm dlx always " +
                    'resolves to whatever release is currently published on the registry, so a compromised ' +
                    'or malicious package update reaches every agent invocation immediately, with no PR for ' +
                    'anyone to review.',
            });
        });
        it('produces zero findings when pnpm dlx package is pinned (fixture)', () => {
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('pnpm-dlx-pinned'))).toHaveLength(0);
        });
        it('fires for pnpm dlx with unpinned package (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'pnpm', args: ['dlx', 'mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via pnpm dlx with no version pin");
        });
        it('produces zero findings when pnpm dlx package is pinned (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'pnpm', args: ['dlx', 'mcp-server-fetch@1.2.3'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('does not fire for bare pnpm (no dlx subcommand)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'pnpm', args: ['mcp-server-fetch'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('fires for pnpm dlx with -y flag before package name', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'pnpm', args: ['dlx', '-y', 'mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
        });
    });
    describe('yarn dlx', () => {
        it('fires a WARNING finding for yarn dlx with an unpinned package (fixture)', () => {
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('yarn-dlx-unpinned'));
            expect(findings).toHaveLength(1);
            expect(findings[0]).toEqual({
                detectorId: 'diff-drift.unpinned-mcp-dependency',
                severity: 'warning',
                file: filePath,
                summary: "MCP server 'fetch' installs 'mcp-server-fetch' via yarn dlx with no version pin",
                detail: "The MCP server 'fetch' in .mcp.json runs 'mcp-server-fetch' via yarn dlx with no pinned " +
                    "version. Without an explicit version (e.g. 'mcp-server-fetch@1.2.3'), yarn dlx always " +
                    'resolves to whatever release is currently published on the registry, so a compromised ' +
                    'or malicious package update reaches every agent invocation immediately, with no PR for ' +
                    'anyone to review.',
            });
        });
        it('produces zero findings when yarn dlx package is pinned (fixture)', () => {
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('yarn-dlx-pinned'))).toHaveLength(0);
        });
        it('fires for yarn dlx with unpinned package (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'yarn', args: ['dlx', 'mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via yarn dlx with no version pin");
        });
        it('produces zero findings when yarn dlx package is pinned (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'yarn', args: ['dlx', 'mcp-server-fetch@1.2.3'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('does not fire for bare yarn (no dlx subcommand)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'yarn', args: ['mcp-server-fetch'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
    });
    describe('bunx', () => {
        it('fires a WARNING finding for bunx with an unpinned package (fixture)', () => {
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('bunx-unpinned'));
            expect(findings).toHaveLength(1);
            expect(findings[0]).toEqual({
                detectorId: 'diff-drift.unpinned-mcp-dependency',
                severity: 'warning',
                file: filePath,
                summary: "MCP server 'fetch' installs 'mcp-server-fetch' via bunx with no version pin",
                detail: "The MCP server 'fetch' in .mcp.json runs 'mcp-server-fetch' via bunx with no pinned " +
                    "version. Without an explicit version (e.g. 'mcp-server-fetch@1.2.3'), bunx always " +
                    'resolves to whatever release is currently published on the registry, so a compromised ' +
                    'or malicious package update reaches every agent invocation immediately, with no PR for ' +
                    'anyone to review.',
            });
        });
        it('produces zero findings when bunx package is pinned (fixture)', () => {
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, readFixture('bunx-pinned'))).toHaveLength(0);
        });
        it('fires for bunx with unpinned package (inline)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'bunx', args: ['mcp-server-fetch'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch' via bunx with no version pin");
        });
        it('produces zero findings when bunx package is pinned (@version pin)', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'bunx', args: ['mcp-server-fetch@1.2.3'] } },
            });
            expect((0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('treats bunx with a floating dist-tag as unpinned', () => {
            const headContent = JSON.stringify({
                mcpServers: { fetch: { command: 'bunx', args: ['mcp-server-fetch@latest'] } },
            });
            const findings = (0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)('.mcp.json', headContent);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe("MCP server 'fetch' installs 'mcp-server-fetch@latest' via bunx with no version pin");
        });
    });
});

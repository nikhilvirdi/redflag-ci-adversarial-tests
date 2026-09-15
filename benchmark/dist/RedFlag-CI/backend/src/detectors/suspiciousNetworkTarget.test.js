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
const suspiciousNetworkTarget_1 = require("./suspiciousNetworkTarget");
describe('Task 5.5: detectSuspiciousNetworkTarget', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'suspicious-network-target');
    const filePath = '.mcp.json';
    const readFixture = (name) => fs.readFileSync(path.join(fixturesDir, name, '.mcp.json'), 'utf-8');
    it('fires a WARNING-severity finding for a bare IP literal in args (fixture)', () => {
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)(filePath, readFixture('bare-ip'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.suspicious-network-target',
            severity: 'warning',
            file: filePath,
            summary: "MCP server 'remote-db' uses bare IP target '192.168.1.1'",
            detail: "The MCP server 'remote-db' in .mcp.json configures bare IP target '192.168.1.1'. " +
                'Hardcoding bare IP addresses bypasses domain name validation, TLS certificate ' +
                'verification, and standard DNS governance.',
        });
    });
    it('fires a WARNING-severity finding for a non-HTTPS http:// URL in env (fixture)', () => {
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)(filePath, readFixture('http-url'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.suspicious-network-target',
            severity: 'warning',
            file: filePath,
            summary: "MCP server 'insecure-api' uses insecure HTTP target 'http://api.example.com/v1'",
            detail: "The MCP server 'insecure-api' in .mcp.json configures non-HTTPS target 'http://api.example.com/v1'. " +
                'Using unencrypted HTTP exposes network traffic and credentials to interception or tampering.',
        });
    });
    it('produces zero findings when the MCP server uses an https:// URL (fixture)', () => {
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)(filePath, readFixture('https-url'));
        expect(findings).toHaveLength(0);
    });
    it('produces zero findings for local targets like localhost / 127.0.0.1 / 0.0.0.0 (fixture)', () => {
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)(filePath, readFixture('localhost'));
        expect(findings).toHaveLength(0);
    });
    it('is a current-state check: fires on head content alone with no base argument', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['10.0.0.1'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
    });
    it('detects bare IP in env values as well as args', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', env: { DB_HOST: '172.16.0.5' } },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'server' uses bare IP target '172.16.0.5'");
    });
    it('detects non-HTTPS http:// URL in args as well as env', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['--url=http://insecure-host.internal/api'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'server' uses insecure HTTP target 'http://insecure-host.internal/api'");
    });
    it('exempts http://localhost, http://127.0.0.1, and http://0.0.0.0 with optional ports', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                s1: { command: 'node', args: ['http://localhost:3000'] },
                s2: { command: 'node', args: ['http://127.0.0.1:8080/health'] },
                s3: { command: 'node', args: ['http://0.0.0.0:9000'] },
            },
        });
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('detects multiple suspicious targets across different servers', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                a: { command: 'node', args: ['192.168.1.5'] },
                b: { command: 'node', args: ['https://secure.com'] },
                c: { command: 'node', env: { URL: 'http://plain-http.org' } },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(2);
        const summaries = findings.map((f) => f.summary);
        expect(summaries).toContain("MCP server 'a' uses bare IP target '192.168.1.5'");
        expect(summaries).toContain("MCP server 'c' uses insecure HTTP target 'http://plain-http.org'");
    });
    it('fails open (returns 0 findings) for a malformed server entry that is not an object', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                weird: 'just-a-string',
            },
        });
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('falls back to regex hostname extraction when the WHATWG URL parser rejects the matched URL', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['http://%zz/path'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'server' uses insecure HTTP target 'http://%zz/path'");
    });
    it('falls back to regex hostname extraction and still exempts localhost-shaped hosts the URL parser rejects', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['http://:8080/health'] },
            },
        });
        // new URL('http://:8080/health') throws (empty host before the port),
        // and the fallback regex requires a non-empty, non-colon first
        // character after "http://" -- it also fails to extract a host here,
        // so this falls open (0 findings) rather than firing or crashing.
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
    });
    it('still fires as a bare-IP target for a non-exempt IP behind https://, since HTTPS does not fix the missing DNS/cert-validation concern', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['https://8.8.8.8/api'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'server' uses bare IP target '8.8.8.8'");
    });
    it('does not double-report a non-exempt IP behind http:// (already reported as insecure-HTTP)', () => {
        const headContent = JSON.stringify({
            mcpServers: {
                server: { command: 'node', args: ['http://8.8.8.8/api'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("MCP server 'server' uses insecure HTTP target 'http://8.8.8.8/api'");
    });
    it('produces zero findings when headContent is null (file deleted in head)', () => {
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', null)).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when headContent is malformed JSON', () => {
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', '{ invalid json')).toHaveLength(0);
    });
    it('fails open (returns 0 findings) when content is valid JSON primitive or array', () => {
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', '[1, 2, 3]')).toHaveLength(0);
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', '"hello"')).toHaveLength(0);
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', '123')).toHaveLength(0);
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', 'null')).toHaveLength(0);
        expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', '')).toHaveLength(0);
    });
    it('supports "servers" top-level key as well as "mcpServers"', () => {
        const headContent = JSON.stringify({
            servers: {
                api: { command: 'node', args: ['10.0.0.99'] },
            },
        });
        const findings = (0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('claude_desktop_config.json', headContent);
        expect(findings).toHaveLength(1);
        expect(findings[0].file).toBe('claude_desktop_config.json');
    });
    describe('False positive reduction for version-like strings', () => {
        it('produces zero findings for a standalone version value (e.g., a version-like string)', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['10.20.30.40.tgz'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('produces zero findings for a version embedded in an arg', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', env: { VERSION: 'package-10.20.30.40' } },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('produces zero findings for a version embedded mid-word', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['--version=10.20.30.40'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(0);
        });
        it('still fires for the same digits as a genuine bare IP (whole value)', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['10.20.30.40'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(1);
        });
        it('still fires for the same digits in an ip:port shape', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['10.20.30.40:8080'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(1);
        });
        it('still fires for the same digits inside an actual URL shape', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['tcp://10.20.30.40/path'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(1);
        });
        it('still fires for the same digits inside a URL with auth', () => {
            const headContent = JSON.stringify({
                mcpServers: {
                    server: { command: 'node', args: ['postgres://user:pass@10.20.30.40/db'] },
                },
            });
            expect((0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)('.mcp.json', headContent)).toHaveLength(1);
        });
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectSuspiciousNetworkTarget = detectSuspiciousNetworkTarget;
// Mirrors DD-1/DD-2's own parseMcpServerEntries: both "mcpServers" and
// "servers" are read and merged, "mcpServers" winning on a name collision,
// duplicated locally rather than imported since this task is scoped to
// touching only this file.
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
// Localhost targets ("localhost", "127.0.0.1", "0.0.0.0", and "http://" URLs pointing
// to them) are explicitly exempted from triggering findings. Local loopback addresses
// and local bind targets are standard in development configurations (e.g., local MCP
// servers or local sidecar proxies). Flagging local loopback targets would create high
// false-positive noise without adding security benefit.
const EXEMPT_HOSTS = new Set(['localhost', '127.0.0.1', '0.0.0.0']);
// Match IPv4 dotted-quad addresses.
const IPV4_REGEX = /\b(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g;
// Match non-HTTPS http:// URLs.
const HTTP_URL_REGEX = /http:\/\/([^\s"'`<>]+)/gi;
function cleanUrl(urlStr) {
    return urlStr.replace(/[.,);]+$/, '');
}
function extractHostnameFromHttpUrl(urlStr) {
    try {
        const cleaned = cleanUrl(urlStr);
        const parsed = new URL(cleaned);
        return parsed.hostname.toLowerCase();
    }
    catch {
        const match = /^http:\/\/([^/:?#\s]+)/i.exec(urlStr);
        if (!match) {
            return null;
        }
        return match[1].toLowerCase();
    }
}
// Current-state check like RF-1/RF-2/DD-5, not a diff: a suspicious network
// target is a live risk on every PR it's still present in, so this only ever
// looks at head content.
function detectSuspiciousNetworkTarget(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    const entries = parseMcpServerEntries(headContent);
    if (!entries) {
        return [];
    }
    const findings = [];
    for (const [serverName, definition] of Object.entries(entries)) {
        const stringsToCheck = [];
        const args = getField(definition, 'args');
        if (Array.isArray(args)) {
            for (const arg of args) {
                if (typeof arg === 'string') {
                    stringsToCheck.push(arg);
                }
            }
        }
        const env = getField(definition, 'env');
        if (typeof env === 'object' && env !== null && !Array.isArray(env)) {
            for (const val of Object.values(env)) {
                if (typeof val === 'string') {
                    stringsToCheck.push(val);
                }
            }
        }
        for (const val of stringsToCheck) {
            const httpMatches = val.matchAll(HTTP_URL_REGEX);
            for (const match of httpMatches) {
                const rawUrl = cleanUrl(match[0]);
                const hostname = extractHostnameFromHttpUrl(rawUrl);
                if (hostname && !EXEMPT_HOSTS.has(hostname)) {
                    findings.push({
                        detectorId: 'diff-drift.suspicious-network-target',
                        severity: 'warning',
                        file: filePath,
                        summary: `MCP server '${serverName}' uses insecure HTTP target '${rawUrl}'`,
                        detail: `The MCP server '${serverName}' in ${filePath} configures non-HTTPS target '${rawUrl}'. Using unencrypted HTTP exposes network traffic and credentials to interception or tampering.`,
                    });
                }
            }
            for (const ipMatch of val.matchAll(IPV4_REGEX)) {
                const ip = ipMatch[0];
                const matchIndex = ipMatch.index;
                if (EXEMPT_HOSTS.has(ip)) {
                    continue;
                }
                // Only http:// is skipped here: that case is already reported as an
                // insecure-HTTP finding above, so this avoids double-reporting the
                // same address. https:// is deliberately NOT skipped -- a bare IP
                // behind HTTPS still bypasses domain name validation, TLS
                // certificate verification, and DNS governance, so it must still
                // fall through to the bare-IP check below.
                const prefix7 = val.slice(Math.max(0, matchIndex - 7), matchIndex).toLowerCase();
                if (prefix7.endsWith('http://')) {
                    continue;
                }
                // To reduce false positives on version-like strings (e.g. "package-10.20.30.40.tgz"),
                // we require the matched IP to either occupy the entire value, or be part of a clearly
                // network-shaped substring like <ip>:<port>, <ip>/<path>, or <proto>://<ip>.
                // We chose this approach (context-awareness of the IP's position) because it cleanly
                // isolates actual network targets without needing to enumerate every possible way a
                // version string might be formatted.
                const isEntireValue = ip === val.trim();
                const charAfter = matchIndex + ip.length < val.length ? val[matchIndex + ip.length] : '';
                const prefix = val.slice(0, matchIndex);
                const hasPort = charAfter === ':';
                const hasPath = charAfter === '/';
                const hasProtocol = prefix.endsWith('://');
                const isUrlAuth = prefix.includes('://') && prefix.endsWith('@');
                if (!isEntireValue && !hasPort && !hasPath && !hasProtocol && !isUrlAuth) {
                    continue;
                }
                findings.push({
                    detectorId: 'diff-drift.suspicious-network-target',
                    severity: 'warning',
                    file: filePath,
                    summary: `MCP server '${serverName}' uses bare IP target '${ip}'`,
                    detail: `The MCP server '${serverName}' in ${filePath} configures bare IP target '${ip}'. Hardcoding bare IP addresses bypasses domain name validation, TLS certificate verification, and standard DNS governance.`,
                });
            }
        }
    }
    return findings;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectUnpinnedMcpDependency = detectUnpinnedMcpDependency;
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
// A version spec only pins anything if it's actually shaped like a semver
// version ("1.2.3", "2.0.0-beta.1", ...). A floating dist-tag -- "latest",
// "next", "canary", "beta", or any other bare word after "@" -- resolves to
// whatever the registry currently marks it as pointing to, the exact same
// non-deterministic resolution as no pin at all; syntactically it's just as
// "@something" as a real pin, so checking only for the presence of an "@"
// (the previous behavior) let "npx malicious-package@latest" read as pinned.
const SEMVER_SHAPED = /^\d/;
// An npm package specifier is pinned when it carries an explicit "@version"
// suffix, and that suffix is semver-shaped. Scoped packages ("@scope/name")
// already start with one "@" for the scope itself, so that leading character
// is stripped before looking for a second "@" -- otherwise every scoped
// package would read as "pinned" on its scope marker alone.
function isPinnedPackageSpec(spec) {
    const withoutScope = spec.startsWith('@') ? spec.slice(1) : spec;
    const atIndex = withoutScope.indexOf('@');
    if (atIndex === -1) {
        return false;
    }
    return SEMVER_SHAPED.test(withoutScope.slice(atIndex + 1));
}
// The package being run is the first argument that isn't itself a flag
// (e.g. "-y" ahead of it). Anything after the package (server-specific args
// like a working directory) is irrelevant to identifying what's unpinned.
function findPackageSpec(args) {
    if (!Array.isArray(args)) {
        return null;
    }
    const packageArg = args.find((arg) => typeof arg === 'string' && !arg.startsWith('-'));
    return packageArg ?? null;
}
// Returns the basename (last path segment) of a command string, normalising
// both forward-slash and backslash separators. Used to handle absolute-path
// invocations like "/usr/local/bin/npx" or "C:\...\npx.cmd".
function basename(command) {
    // Replace all backslashes with forward slashes then take last segment.
    return command.replace(/\\/g, '/').split('/').pop() ?? command;
}
function classifyRunner(command, args) {
    const base = basename(command);
    // Single-token runners: the whole command names the runner.
    if (base === 'npx' || base === 'npx.cmd') {
        return { runnerLabel: base === 'npx.cmd' ? 'npx.cmd' : 'npx', consumedArgCount: 0 };
    }
    if (base === 'bunx') {
        return { runnerLabel: 'bunx', consumedArgCount: 0 };
    }
    // Two-token runners: command is the package manager, first non-flag arg must
    // be "dlx". We check args[0] directly (before the flag-skip in
    // findPackageSpec) since "dlx" is a subcommand, not a package name.
    if (base === 'pnpm' || base === 'yarn') {
        if (args.length > 0 && args[0] === 'dlx') {
            return { runnerLabel: `${base} dlx`, consumedArgCount: 1 };
        }
    }
    return null;
}
// Current-state check like RF-1/RF-2, not a diff: an unpinned server is a
// live risk on every PR it's still present in, not just the PR that added or
// changed it, so this only ever looks at head content.
function detectUnpinnedMcpDependency(filePath, headContent) {
    if (headContent === null) {
        return [];
    }
    const entries = parseMcpServerEntries(headContent);
    if (!entries) {
        return [];
    }
    const findings = [];
    for (const [serverName, definition] of Object.entries(entries)) {
        const command = getField(definition, 'command');
        if (typeof command !== 'string') {
            continue;
        }
        const rawArgs = getField(definition, 'args');
        const argsArray = Array.isArray(rawArgs) ? rawArgs : [];
        const runner = classifyRunner(command, argsArray);
        if (!runner) {
            continue;
        }
        // For two-token runners (pnpm dlx / yarn dlx), args[0] is "dlx" (already
        // consumed), so pass the remaining tail to findPackageSpec.
        const packageArgs = argsArray.slice(runner.consumedArgCount);
        const packageSpec = findPackageSpec(packageArgs);
        if (packageSpec === null || isPinnedPackageSpec(packageSpec)) {
            continue;
        }
        findings.push({
            detectorId: 'diff-drift.unpinned-mcp-dependency',
            severity: 'warning',
            file: filePath,
            summary: `MCP server '${serverName}' installs '${packageSpec}' via ${runner.runnerLabel} with no version pin`,
            detail: `The MCP server '${serverName}' in ${filePath} runs '${packageSpec}' via ${runner.runnerLabel} with no pinned version. Without an explicit version (e.g. '${packageSpec}@1.2.3'), ${runner.runnerLabel} always resolves to whatever release is currently published on the registry, so a compromised or malicious package update reaches every agent invocation immediately, with no PR for anyone to review.`,
        });
    }
    return findings;
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cumulativeDrift_1 = require("./cumulativeDrift");
const widenedPermissions_1 = require("./detectors/widenedPermissions");
const FILE = '.claude/settings.json';
describe('Task A.3: detectCumulativeDrift', () => {
    it('catches the adversarial-gradual-drift-two-prs pattern: two small widenings across two merges, invisible individually', () => {
        // Mirrors the benchmark's own adversarial-gradual-drift-two-prs-pr1/pr2
        // pair: an empty baseline, pr1 (already merged, reflected in the
        // baseline) adds "Bash(git diff)", and this PR (pr2) adds a second
        // entry, "Bash(git *)", on top of pr1's already-merged change.
        const baseline = JSON.stringify({ permissions: { allow: [], deny: [] } });
        const immediateBase = JSON.stringify({ permissions: { allow: ['Bash(git diff)'], deny: [] } });
        const head = JSON.stringify({ permissions: { allow: ['Bash(git diff)', 'Bash(git *)'], deny: [] } });
        // What the existing, single-PR-scoped comparison already reports:
        // pr2's own diff only ever shows the second entry as new.
        const immediateFindings = (0, widenedPermissions_1.detectWidenedPermissions)(FILE, immediateBase, head);
        expect(immediateFindings.map((f) => f.summary)).toEqual(["Permission 'Bash(git *)' added to allow-list"]);
        const cumulative = (0, cumulativeDrift_1.detectCumulativeDrift)(FILE, baseline, head, immediateFindings);
        // The cumulative check, comparing against the baseline that predates
        // BOTH merges, surfaces the first entry too -- exactly what a
        // single-PR-scoped check structurally cannot see.
        expect(cumulative.map((f) => f.summary)).toEqual(["Permission 'Bash(git diff)' added to allow-list"]);
    });
    it('reports nothing extra when the baseline is identical to the immediate base (no prior accumulated drift)', () => {
        const base = JSON.stringify({ permissions: { allow: ['Read(*)'], deny: [] } });
        const head = JSON.stringify({ permissions: { allow: ['Read(*)', 'Bash(*)'], deny: [] } });
        const immediateFindings = (0, widenedPermissions_1.detectWidenedPermissions)(FILE, base, head);
        expect(immediateFindings.length).toBeGreaterThan(0);
        // Baseline is byte-identical to the immediate base: the cumulative scan
        // finds exactly what the immediate scan already found, so after dedup,
        // nothing new is left to report.
        const cumulative = (0, cumulativeDrift_1.detectCumulativeDrift)(FILE, base, head, immediateFindings);
        expect(cumulative).toEqual([]);
    });
    it('deduplicates by detector + file + summary, not by full object identity', () => {
        const baseline = JSON.stringify({ mcpServers: {} });
        const head = JSON.stringify({ mcpServers: { weather: { command: 'node' } } });
        const alreadyReported = [
            {
                detectorId: 'diff-drift.new-mcp-server',
                severity: 'warning',
                file: FILE,
                summary: "New MCP server 'weather' added",
                detail: 'a differently-worded detail string, still the same underlying finding',
            },
        ];
        const cumulative = (0, cumulativeDrift_1.detectCumulativeDrift)(FILE, baseline, head, alreadyReported);
        expect(cumulative).toEqual([]);
    });
    it('does not dedupe findings that are actually about a different file', () => {
        const baseline = JSON.stringify({ mcpServers: {} });
        const head = JSON.stringify({ mcpServers: { weather: { command: 'node' } } });
        const alreadyReported = [
            {
                detectorId: 'diff-drift.new-mcp-server',
                severity: 'warning',
                file: 'claude_desktop_config.json',
                summary: "New MCP server 'weather' added",
                detail: 'same detector/summary, different file',
            },
        ];
        const cumulative = (0, cumulativeDrift_1.detectCumulativeDrift)(FILE, baseline, head, alreadyReported);
        expect(cumulative).toHaveLength(1);
        expect(cumulative[0].file).toBe(FILE);
    });
    it('surfaces a cumulative transport-type change alongside the widened-permissions cases', () => {
        const baseline = JSON.stringify({ mcpServers: { db: { command: 'node', args: ['db.js'] } } });
        const head = JSON.stringify({ mcpServers: { db: { url: 'https://evil.example.com/mcp' } } });
        const cumulative = (0, cumulativeDrift_1.detectCumulativeDrift)('.mcp.json', baseline, head, []);
        expect(cumulative.some((f) => f.detectorId === 'diff-drift.transport-type-change')).toBe(true);
    });
    it('returns an empty list when head content is null (file deleted in this PR)', () => {
        const baseline = JSON.stringify({ mcpServers: { weather: { command: 'node' } } });
        expect((0, cumulativeDrift_1.detectCumulativeDrift)('.mcp.json', baseline, null, [])).toEqual([]);
    });
    it('returns an empty list when the baseline content itself is malformed (fails open, matching every detector)', () => {
        const head = JSON.stringify({ mcpServers: { weather: { command: 'node' } } });
        expect((0, cumulativeDrift_1.detectCumulativeDrift)('.mcp.json', '{ not valid json', head, [])).toEqual([]);
    });
});

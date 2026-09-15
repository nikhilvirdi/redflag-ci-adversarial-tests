"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exportJson_1 = require("./exportJson");
// Helper: parse and return the typed envelope without repeating JSON.parse
// in every test. Asserts the top-level shape (tool, findingCount, findings)
// before returning so every test also verifies the envelope for free.
function parseEnvelope(json) {
    const parsed = JSON.parse(json); // throws on invalid JSON
    expect(parsed).toBeDefined();
    const envelope = parsed;
    expect(typeof envelope.tool).toBe('string');
    expect(typeof envelope.findingCount).toBe('number');
    expect(Array.isArray(envelope.findings)).toBe(true);
    return envelope;
}
describe('Task B.2: formatFindingsAsJson', () => {
    // -------------------------------------------------------------------------
    // Fixtures
    // -------------------------------------------------------------------------
    const highFinding = {
        detectorId: 'diff-drift.hook-changed',
        severity: 'high',
        file: '.claude/settings.json',
        summary: "New hook 'PostToolUse' added",
        detail: "The head branch adds a new hook 'PostToolUse' with command './scripts/deploy.sh' to .claude/settings.json.",
    };
    const warningFinding = {
        detectorId: 'diff-drift.new-mcp-server',
        severity: 'warning',
        file: '.mcp.json',
        summary: "New MCP server 'example' added",
        detail: "The head branch adds a new MCP server entry 'example' to .mcp.json that was not present in the base branch.",
    };
    const infoFinding = {
        detectorId: 'rule-file.invisible-unicode',
        severity: 'info',
        file: 'CLAUDE.md',
        summary: 'Invisible Unicode character found',
        detail: 'A zero-width space (U+200B) was found in CLAUDE.md at line 3, column 12.',
    };
    // -------------------------------------------------------------------------
    // Valid JSON
    // -------------------------------------------------------------------------
    it('produces valid, parseable JSON for an empty findings list', () => {
        expect(() => parseEnvelope((0, exportJson_1.formatFindingsAsJson)([]))).not.toThrow();
    });
    it('produces valid, parseable JSON for a non-empty findings list', () => {
        expect(() => parseEnvelope((0, exportJson_1.formatFindingsAsJson)([highFinding, warningFinding]))).not.toThrow();
    });
    // -------------------------------------------------------------------------
    // Empty findings
    // -------------------------------------------------------------------------
    it('empty findings → envelope with tool, findingCount: 0, findings: []', () => {
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)([]));
        expect(envelope.tool).toBe('RedFlag CI');
        expect(envelope.findingCount).toBe(0);
        expect(envelope.findings).toEqual([]);
    });
    // -------------------------------------------------------------------------
    // Single finding — all fields pass through unchanged
    // -------------------------------------------------------------------------
    it('single finding → all Finding fields serialized as-is, no transformation', () => {
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)([highFinding]));
        expect(envelope.findings).toHaveLength(1);
        expect(envelope.findings[0].detectorId).toBe(highFinding.detectorId);
        expect(envelope.findings[0].severity).toBe(highFinding.severity);
        expect(envelope.findings[0].file).toBe(highFinding.file);
        expect(envelope.findings[0].summary).toBe(highFinding.summary);
        expect(envelope.findings[0].detail).toBe(highFinding.detail);
    });
    it('single finding → findingCount is 1', () => {
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)([highFinding]));
        expect(envelope.findingCount).toBe(1);
    });
    // -------------------------------------------------------------------------
    // Multiple findings
    // -------------------------------------------------------------------------
    it('multiple findings → all are present in order given', () => {
        const findings = [highFinding, warningFinding, infoFinding];
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)(findings));
        expect(envelope.findings).toHaveLength(3);
        expect(envelope.findings[0].detectorId).toBe('diff-drift.hook-changed');
        expect(envelope.findings[1].detectorId).toBe('diff-drift.new-mcp-server');
        expect(envelope.findings[2].detectorId).toBe('rule-file.invisible-unicode');
    });
    it('multiple findings → findingCount matches findings.length', () => {
        const findings = [highFinding, warningFinding, infoFinding];
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)(findings));
        expect(envelope.findingCount).toBe(findings.length);
        expect(envelope.findingCount).toBe(envelope.findings.length);
    });
    // -------------------------------------------------------------------------
    // findingCount always equals findings.length
    // -------------------------------------------------------------------------
    it('findingCount always equals findings.length for 0, 1, and many findings', () => {
        for (const subset of [
            [],
            [highFinding],
            [highFinding, warningFinding],
            [highFinding, warningFinding, infoFinding],
        ]) {
            const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)(subset));
            expect(envelope.findingCount).toBe(subset.length);
            expect(envelope.findingCount).toBe(envelope.findings.length);
        }
    });
    // -------------------------------------------------------------------------
    // No deduplication, no field renaming (unlike SARIF)
    // -------------------------------------------------------------------------
    it('two findings with the same detectorId both appear in findings[] (no dedup)', () => {
        const duplicate = { ...highFinding, summary: 'A second hook finding' };
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)([highFinding, duplicate]));
        expect(envelope.findings).toHaveLength(2);
        expect(envelope.findings[0].detectorId).toBe('diff-drift.hook-changed');
        expect(envelope.findings[1].detectorId).toBe('diff-drift.hook-changed');
        expect(envelope.findingCount).toBe(2);
    });
    // -------------------------------------------------------------------------
    // Severity values pass through as-is (no SARIF-style level mapping)
    // -------------------------------------------------------------------------
    it('severity values are serialized verbatim: high, warning, info', () => {
        const envelope = parseEnvelope((0, exportJson_1.formatFindingsAsJson)([highFinding, warningFinding, infoFinding]));
        expect(envelope.findings[0].severity).toBe('high');
        expect(envelope.findings[1].severity).toBe('warning');
        expect(envelope.findings[2].severity).toBe('info');
    });
    // -------------------------------------------------------------------------
    // Determinism
    // -------------------------------------------------------------------------
    it('is deterministic: same findings always produce the same JSON string', () => {
        const findings = [highFinding, warningFinding, infoFinding];
        expect((0, exportJson_1.formatFindingsAsJson)(findings)).toBe((0, exportJson_1.formatFindingsAsJson)(findings));
    });
    it('output differs when input differs', () => {
        expect((0, exportJson_1.formatFindingsAsJson)([highFinding])).not.toBe((0, exportJson_1.formatFindingsAsJson)([warningFinding]));
    });
});

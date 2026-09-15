"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const exportSarif_1 = require("./exportSarif");
// Helper: parse the output and assert it has the mandatory SARIF 2.1.0
// top-level shape before checking anything else. Keeps every test focused on
// what it's actually testing rather than re-verifying the envelope each time.
function parseSarif(json) {
    const parsed = JSON.parse(json);
    expect(parsed).toBeDefined();
    // Spot-check the envelope before returning -- every test gets this for free.
    const log = parsed;
    expect(log.version).toBe('2.1.0');
    expect(log.$schema).toBe('https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json');
    expect(Array.isArray(log.runs)).toBe(true);
    expect(log.runs).toHaveLength(1);
    return log;
}
describe('Task B.1: formatFindingsAsSarif', () => {
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
    const secondHighFinding = {
        // Same detectorId as highFinding -- used to test deduplication.
        detectorId: 'diff-drift.hook-changed',
        severity: 'high',
        file: '.claude/settings.json',
        summary: "Hook 'PreToolUse' changed",
        detail: "The already-approved hook 'PreToolUse' had its command modified.",
    };
    // -------------------------------------------------------------------------
    // Envelope / top-level shape
    // -------------------------------------------------------------------------
    it('produces valid JSON parseable without throwing', () => {
        expect(() => parseSarif((0, exportSarif_1.formatFindingsAsSarif)([]))).not.toThrow();
        expect(() => parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding]))).not.toThrow();
    });
    it('returns a SARIF 2.1.0 envelope with $schema, version, and runs[] for an empty list', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([]));
        // All three mandatory envelope fields verified inside parseSarif; spot-check
        // the content-level shape here.
        expect(log.runs[0].tool.driver.name).toBe('RedFlag CI');
        expect(log.runs[0].tool.driver.rules).toEqual([]);
        expect(log.runs[0].results).toEqual([]);
    });
    // -------------------------------------------------------------------------
    // Single finding -- complete field mapping
    // -------------------------------------------------------------------------
    it('maps a single finding to one result with correct ruleId, level, message, and location', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding]));
        const results = log.runs[0].results;
        expect(results).toHaveLength(1);
        expect(results[0].ruleId).toBe('diff-drift.hook-changed');
        expect(results[0].level).toBe('error'); // high → error
        expect(results[0].message.text).toBe(highFinding.detail);
        expect(results[0].locations[0].physicalLocation.artifactLocation.uri).toBe('.claude/settings.json');
    });
    it('emits one rules[] entry for a single finding', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding]));
        const rules = log.runs[0].tool.driver.rules;
        expect(rules).toHaveLength(1);
        expect(rules[0].id).toBe('diff-drift.hook-changed');
        expect(rules[0].shortDescription.text).toBe('Hook changed');
    });
    // -------------------------------------------------------------------------
    // Deduplication: multiple findings sharing one detectorId → one rules[] entry
    // -------------------------------------------------------------------------
    it('emits only one rules[] entry when two findings share the same detectorId', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding, secondHighFinding]));
        const rules = log.runs[0].tool.driver.rules;
        expect(rules).toHaveLength(1);
        expect(rules[0].id).toBe('diff-drift.hook-changed');
        // Two results must still be present.
        expect(log.runs[0].results).toHaveLength(2);
    });
    // -------------------------------------------------------------------------
    // Multiple distinct detector IDs → multiple rules[] entries
    // -------------------------------------------------------------------------
    it('emits one rules[] entry per unique detectorId in first-occurrence order', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding, warningFinding, infoFinding]));
        const rules = log.runs[0].tool.driver.rules;
        expect(rules).toHaveLength(3);
        expect(rules[0].id).toBe('diff-drift.hook-changed');
        expect(rules[1].id).toBe('diff-drift.new-mcp-server');
        expect(rules[2].id).toBe('rule-file.invisible-unicode');
    });
    // -------------------------------------------------------------------------
    // Severity mapping for all three levels
    // -------------------------------------------------------------------------
    it('maps severity "high" → level "error"', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding]));
        expect(log.runs[0].results[0].level).toBe('error');
    });
    it('maps severity "warning" → level "warning"', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([warningFinding]));
        expect(log.runs[0].results[0].level).toBe('warning');
    });
    it('maps severity "info" → level "note"', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([infoFinding]));
        expect(log.runs[0].results[0].level).toBe('note');
    });
    // -------------------------------------------------------------------------
    // region must be omitted (Finding has no structured line/column fields)
    // -------------------------------------------------------------------------
    it('omits region on every finding — Finding carries no structured line/column fields', () => {
        // This applies to all findings today: detectors that locate characters
        // embed position text into the detail string, not into the Finding struct.
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding, warningFinding, infoFinding]));
        for (const result of log.runs[0].results) {
            expect(result.locations[0].physicalLocation.region).toBeUndefined();
        }
    });
    // -------------------------------------------------------------------------
    // message.text uses detail, not summary
    // -------------------------------------------------------------------------
    it('uses finding.detail (not finding.summary) as message.text', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([highFinding]));
        expect(log.runs[0].results[0].message.text).toBe(highFinding.detail);
        expect(log.runs[0].results[0].message.text).not.toBe(highFinding.summary);
    });
    // -------------------------------------------------------------------------
    // Rule name derivation from detector ID
    // -------------------------------------------------------------------------
    it('derives a human-readable rule shortDescription from the detector ID segment', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([warningFinding]));
        // diff-drift.new-mcp-server → "New mcp server"
        expect(log.runs[0].tool.driver.rules[0].shortDescription.text).toBe('New mcp server');
    });
    it('derives correct name for a rule-file.* detector ID', () => {
        const log = parseSarif((0, exportSarif_1.formatFindingsAsSarif)([infoFinding]));
        // rule-file.invisible-unicode → "Invisible unicode"
        expect(log.runs[0].tool.driver.rules[0].shortDescription.text).toBe('Invisible unicode');
    });
    // -------------------------------------------------------------------------
    // Determinism: same input → same output
    // -------------------------------------------------------------------------
    it('is deterministic: same findings always produce the same JSON string', () => {
        const findings = [highFinding, warningFinding, infoFinding];
        expect((0, exportSarif_1.formatFindingsAsSarif)(findings)).toBe((0, exportSarif_1.formatFindingsAsSarif)(findings));
    });
});

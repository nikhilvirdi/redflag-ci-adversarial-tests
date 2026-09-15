"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFindingsAsSarif = formatFindingsAsSarif;
// SARIF 2.1.0 schema URL, referenced in the top-level $schema field.
// Spec: https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json
const SARIF_SCHEMA = 'https://docs.oasis-open.org/sarif/sarif/v2.1.0/errata01/os/schemas/sarif-schema-2.1.0.json';
const SARIF_VERSION = '2.1.0';
// Maps Finding.severity → SARIF result.level.
// SARIF levels: "error", "warning", "note", "none".
// "info" → "note" follows the SARIF spec convention: "note" is the
// informational level, matching what GitHub Code Scanning renders
// for informational annotations.
const LEVEL_MAP = {
    high: 'error',
    warning: 'warning',
    info: 'note',
};
// Derives a human-readable rule name from a detector ID by stripping the
// namespace prefix and converting the kebab-case remainder into title case.
// Examples:
//   diff-drift.new-mcp-server      → "New MCP server added"
//   rule-file.invisible-unicode    → "Invisible unicode"
//   diff-drift.swapped-mcp-server  → "Swapped MCP server"
//
// The last segment of the ID (after the final ".") is the canonical rule
// name; the "diff-drift" / "rule-file" prefix names the category, not the
// rule, and repeating it in the human label adds noise rather than clarity.
// Title-casing just the first letter of the segment (not every word) keeps
// the label readable -- "New mcp server" reads as a sentence fragment, which
// is what shortDescription.text is: a brief noun phrase, not a headline.
function ruleNameFromId(detectorId) {
    const lastDot = detectorId.lastIndexOf('.');
    const segment = lastDot === -1 ? detectorId : detectorId.slice(lastDot + 1);
    const human = segment.replace(/-/g, ' ');
    return human.charAt(0).toUpperCase() + human.slice(1);
}
// The Finding interface (types.ts) carries no structured line/column fields --
// detectors that locate a character (RF-1, RF-2) embed position text into the
// detail string ("at line N, column M") rather than returning it as a typed
// field. SARIF region values must not be fabricated from text-parsing
// detail strings (fragile, format-dependent) and must not default to 1,1
// (misleading for diff-drift findings that have no character position at all).
// This function therefore always returns undefined today, documenting the
// boundary clearly: if Finding grows optional line/column fields in a future
// version, this is the one place to update.
function physicalLocation(finding) {
    // No structured position data in Finding today; region is always omitted.
    // Future: if Finding gains `line?: number; column?: number` fields,
    // conditionally set region: { startLine: finding.line, startColumn: finding.column }.
    return {
        artifactLocation: {
            uri: finding.file,
        },
    };
}
// Pure function: given any Finding[], returns a SARIF 2.1.0-compliant JSON
// string. No I/O, no side effects -- the same input always produces the same
// output (architecture.md section 2: deterministic everywhere).
//
// One runs[] entry is always emitted, even for an empty findings list: a
// run with zero results is valid SARIF and correctly signals "tool executed,
// nothing found," which is distinct from "tool was not invoked."
//
// rules[] contains one entry per unique detectorId seen across all findings,
// not one entry per finding -- SARIF's toolComponent.rules is a descriptor
// table, not a per-result repetition. Ordering is insertion order of first
// occurrence, which is stable when findings arrive pre-sorted (as
// aggregateFindings.ts guarantees).
function formatFindingsAsSarif(findings) {
    // Collect unique detector IDs in first-occurrence order. Map preserves
    // insertion order in ES2015+, which this project's tsconfig targets (ES2022).
    const ruleMap = new Map();
    for (const finding of findings) {
        if (!ruleMap.has(finding.detectorId)) {
            ruleMap.set(finding.detectorId, {
                id: finding.detectorId,
                shortDescription: { text: ruleNameFromId(finding.detectorId) },
            });
        }
    }
    const results = findings.map((finding) => ({
        ruleId: finding.detectorId,
        level: LEVEL_MAP[finding.severity],
        message: { text: finding.detail },
        locations: [
            {
                physicalLocation: physicalLocation(finding),
            },
        ],
    }));
    const log = {
        version: SARIF_VERSION,
        $schema: SARIF_SCHEMA,
        runs: [
            {
                tool: {
                    driver: {
                        name: 'RedFlag CI',
                        rules: [...ruleMap.values()],
                    },
                },
                results,
            },
        ],
    };
    return JSON.stringify(log, null, 2);
}

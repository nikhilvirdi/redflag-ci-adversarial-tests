"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFindingsAsJson = formatFindingsAsJson;
// Pure function: given any Finding[], returns a stable JSON string of the
// findings array wrapped in a minimal metadata envelope. No I/O, no side
// effects -- same input always produces the same output (architecture.md
// section 2: deterministic everywhere).
//
// Each Finding is serialized as-is with all its existing fields intact --
// unlike the SARIF exporter (exportSarif.ts), this format imposes no external
// schema and needs no field mapping or deduplication. Consumers that want raw
// finding data without SARIF's tool/rules/runs structure can use this instead.
//
// findingCount is included alongside findings[] so a consumer can check the
// total without computing findings.length itself -- a minor but consistent
// convenience for dashboards and log aggregators that parse only the envelope.
function formatFindingsAsJson(findings) {
    const envelope = {
        tool: 'RedFlag CI',
        findingCount: findings.length,
        findings,
    };
    return JSON.stringify(envelope, null, 2);
}

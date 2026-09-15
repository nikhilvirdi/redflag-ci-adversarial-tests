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
exports.runBenchmark = runBenchmark;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const manifest_1 = require("./corpus/manifest");
const newMcpServer_1 = require("../../RedFlag-CI/backend/src/detectors/newMcpServer");
const swappedMcpServer_1 = require("../../RedFlag-CI/backend/src/detectors/swappedMcpServer");
const widenedPermissions_1 = require("../../RedFlag-CI/backend/src/detectors/widenedPermissions");
const hookChanged_1 = require("../../RedFlag-CI/backend/src/detectors/hookChanged");
const monitoredFileDeleted_1 = require("../../RedFlag-CI/backend/src/detectors/monitoredFileDeleted");
const unpinnedMcpDependency_1 = require("../../RedFlag-CI/backend/src/detectors/unpinnedMcpDependency");
const obfuscatedCommand_1 = require("../../RedFlag-CI/backend/src/detectors/obfuscatedCommand");
const duplicateJsonKey_1 = require("../../RedFlag-CI/backend/src/detectors/duplicateJsonKey");
const suspiciousNetworkTarget_1 = require("../../RedFlag-CI/backend/src/detectors/suspiciousNetworkTarget");
const pathTraversal_1 = require("../../RedFlag-CI/backend/src/detectors/pathTraversal");
const transportTypeChange_1 = require("../../RedFlag-CI/backend/src/detectors/transportTypeChange");
const invisibleUnicode_1 = require("../../RedFlag-CI/backend/src/detectors/invisibleUnicode");
const homoglyphs_1 = require("../../RedFlag-CI/backend/src/detectors/homoglyphs");
const ruleFileJsonKeys_1 = require("../../RedFlag-CI/backend/src/detectors/ruleFileJsonKeys");
const aggregateFindings_1 = require("../../RedFlag-CI/backend/src/aggregateFindings");
// Resolved from process.cwd() (run from redflag-ci-adversarial-tests/, which sits
// beside RedFlag-CI/), not __dirname: tsc only compiles .ts files, so the compiled
// run.js ends up nested under benchmark/dist/redflag-ci-adversarial-tests/benchmark/,
// while the corpus fixtures stay put at their source location, benchmark/corpus/.
const CORPUS_DIR = path.join(process.cwd(), 'benchmark', 'corpus');
// Mirrors processPullRequestEvent.ts's engine dispatch exactly -- this is the
// actual production pipeline logic, not a reimplementation, run directly
// against each corpus pair instead of through detector-level unit tests.
function runDiffDriftDetectors(filePath, base, head) {
    // Mirrors processPullRequestEvent.ts's DD-8 short-circuit exactly: a
    // monitored file present in base and absent in head reports the deletion
    // instead of running the normal detectors, all of which return [] on a
    // null head regardless.
    if (base !== null && head === null) {
        return (0, monitoredFileDeleted_1.detectMonitoredFileDeleted)(filePath, base, head);
    }
    return [
        ...(0, newMcpServer_1.detectNewMcpServer)(filePath, base, head),
        ...(0, swappedMcpServer_1.detectSwappedMcpServer)(filePath, base, head),
        ...(0, widenedPermissions_1.detectWidenedPermissions)(filePath, base, head),
        ...(0, hookChanged_1.detectHookChanged)(filePath, base, head),
        ...(0, unpinnedMcpDependency_1.detectUnpinnedMcpDependency)(filePath, head),
        ...(0, obfuscatedCommand_1.detectObfuscatedCommand)(filePath, head),
        ...(0, duplicateJsonKey_1.detectDuplicateJsonKey)(filePath, head),
        ...(0, suspiciousNetworkTarget_1.detectSuspiciousNetworkTarget)(filePath, head),
        ...(0, pathTraversal_1.detectPathTraversal)(filePath, head),
        ...(0, transportTypeChange_1.detectTransportTypeChange)(filePath, base, head),
        ...(0, ruleFileJsonKeys_1.detectRuleFileChecksInJsonKeys)(filePath, head),
    ];
}
function runRuleFileDetectors(filePath, head) {
    if (head === null) {
        return [];
    }
    return [...(0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, head), ...(0, homoglyphs_1.detectHomoglyphs)(filePath, head)];
}
function readScenarioFiles(scenario) {
    const ext = path.extname(scenario.filePath);
    const dir = path.join(CORPUS_DIR, scenario.id);
    const afterPath = path.join(dir, `after${ext}`);
    return {
        before: fs.readFileSync(path.join(dir, `before${ext}`), 'utf-8'),
        // A missing after file is not an error -- it's the scenario: the
        // monitored file was deleted between base and head, so there is no
        // "after" content to read, only its absence.
        after: fs.existsSync(afterPath) ? fs.readFileSync(afterPath, 'utf-8') : null,
    };
}
function classify(groundTruth, fired) {
    if (groundTruth === 'positive') {
        return fired ? 'TP' : 'FN';
    }
    return fired ? 'FP' : 'TN';
}
function runScenario(scenario) {
    const { before, after } = readScenarioFiles(scenario);
    const rawFindings = scenario.engine === 'diff-drift'
        ? runDiffDriftDetectors(scenario.filePath, before, after)
        : runRuleFileDetectors(scenario.filePath, after);
    const findings = (0, aggregateFindings_1.aggregateFindings)([rawFindings]);
    const fired = findings.length > 0;
    return { scenario, findings, fired, classification: classify(scenario.groundTruth, fired) };
}
function runBenchmark() {
    return manifest_1.SCENARIOS.map(runScenario);
}
function summarize(results) {
    const counts = { TP: 0, FP: 0, TN: 0, FN: 0 };
    for (const r of results) {
        counts[r.classification]++;
    }
    const precision = counts.TP / (counts.TP + counts.FP);
    const recall = counts.TP / (counts.TP + counts.FN);
    return { counts, precision, recall };
}
function breakdownByDetector(results) {
    const byDetector = new Map();
    for (const r of results) {
        const key = r.scenario.detectorUnderTest;
        const list = byDetector.get(key) ?? [];
        list.push(r);
        byDetector.set(key, list);
    }
    return [...byDetector.entries()]
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([detectorId, list]) => {
        const positives = list.filter((r) => r.scenario.groundTruth === 'positive');
        const negatives = list.filter((r) => r.scenario.groundTruth === 'negative');
        return {
            detectorId,
            positiveScenarios: positives.length,
            positivesCaught: positives.filter((r) => r.classification === 'TP').length,
            negativeScenarios: negatives.length,
            negativesMisfired: negatives.filter((r) => r.classification === 'FP').length,
        };
    });
}
function formatFindingsList(findings) {
    if (findings.length === 0) {
        return '(none)';
    }
    return findings.map((f) => `${f.detectorId} [${f.severity}]: ${f.summary}`).join('; ');
}
function buildResultsMarkdown(results, generatedAt) {
    const { counts, precision, recall } = summarize(results);
    const breakdown = breakdownByDetector(results);
    const misclassified = results.filter((r) => r.classification === 'FP' || r.classification === 'FN');
    const lines = [];
    lines.push('# RedFlag CI v1 Benchmark Results');
    lines.push('');
    lines.push(`Generated: ${generatedAt}`);
    lines.push('');
    lines.push('## Methodology');
    lines.push('');
    lines.push(`${results.length} synthetic PR scenarios, each a before/after file pair for one monitored file, stored under ` +
        '`benchmark/corpus/<scenario-id>/`. `benchmark/run.ts` runs the actual production detector ' +
        'functions and `aggregateFindings` against each pair -- the same dispatch logic ' +
        '`processPullRequestEvent.ts` uses (diff-drift files get DD-1 through DD-4, the ' +
        'unpinned-MCP-dependency, obfuscated-command, duplicate-JSON-key, suspicious-network-target, ' +
        'path-traversal, and transport-type-change checks, plus RF-1/RF-2 against MCP server names ' +
        'and permission entries; rule-file files get RF-1/RF-2 against head content only) -- ' +
        'with no GitHub API, webhook, or posting involved. Each ' +
        "scenario carries a ground-truth label (`positive` = should produce at least one finding, " +
        '`negative` = should produce none). A scenario "fires" if the aggregated findings array is ' +
        'non-empty. No detector logic was modified to produce these numbers.');
    lines.push('');
    lines.push('Classification:');
    lines.push('- **TP**: positive label, fired');
    lines.push('- **FN**: positive label, did not fire');
    lines.push('- **FP**: negative label, fired');
    lines.push('- **TN**: negative label, did not fire');
    lines.push('');
    lines.push('## Headline numbers');
    lines.push('');
    lines.push(`- True positives: ${counts.TP}`);
    lines.push(`- False positives: ${counts.FP}`);
    lines.push(`- True negatives: ${counts.TN}`);
    lines.push(`- False negatives: ${counts.FN}`);
    lines.push(`- **Precision** = TP / (TP + FP) = ${counts.TP} / ${counts.TP + counts.FP} = ${precision.toFixed(3)}`);
    lines.push(`- **Recall** = TP / (TP + FN) = ${counts.TP} / ${counts.TP + counts.FN} = ${recall.toFixed(3)}`);
    lines.push('');
    lines.push(`These numbers describe this ${results.length}-scenario corpus, not a statistically representative sample of ` +
        'real-world PRs. The corpus intentionally includes near-miss and known-gap cases designed to ' +
        "surface the detectors' actual limits (see below) rather than a set chosen to look clean.");
    lines.push('');
    lines.push('## Breakdown by detector');
    lines.push('');
    lines.push('| Detector | Positive scenarios | Caught (TP) | Negative scenarios | Misfired (FP) |');
    lines.push('|---|---|---|---|---|');
    for (const b of breakdown) {
        lines.push(`| \`${b.detectorId}\` | ${b.positiveScenarios} | ${b.positivesCaught} | ${b.negativeScenarios} | ${b.negativesMisfired} |`);
    }
    lines.push('');
    lines.push('## Full scenario results');
    lines.push('');
    lines.push('| ID | File | Ground truth | Fired? | Result | Findings |');
    lines.push('|---|---|---|---|---|---|');
    for (const r of results) {
        lines.push(`| \`${r.scenario.id}\` | \`${r.scenario.filePath}\` | ${r.scenario.groundTruth} | ${r.fired} | **${r.classification}** | ${formatFindingsList(r.findings)} |`);
    }
    lines.push('');
    lines.push('## False positives and false negatives, explained honestly');
    lines.push('');
    lines.push(`${misclassified.length} of 18 scenarios were misclassified by the tool relative to this corpus's ` +
        'ground truth. None of these are implementation bugs in the sense of "the code does not match its ' +
        'own spec" -- each is the detector behaving exactly as designed, on a case where that design has a ' +
        'real, documented limit. They are recorded here, not fixed, per this task\'s scope.');
    lines.push('');
    for (const r of misclassified) {
        lines.push(`### \`${r.scenario.id}\` (${r.classification})`);
        lines.push('');
        lines.push(r.scenario.description);
        lines.push('');
        if (r.scenario.note) {
            lines.push(`**Why**: ${r.scenario.note}`);
            lines.push('');
        }
        lines.push(`**Actual findings**: ${formatFindingsList(r.findings)}`);
        lines.push('');
    }
    return lines.join('\n');
}
function main() {
    const results = runBenchmark();
    const { counts, precision, recall } = summarize(results);
    console.log('RedFlag CI benchmark -- scenario results:');
    for (const r of results) {
        console.log(`  [${r.classification}] ${r.scenario.id} (expected: ${r.scenario.groundTruth}, fired: ${r.fired})`);
    }
    console.log('');
    console.log(`TP=${counts.TP} FP=${counts.FP} TN=${counts.TN} FN=${counts.FN}`);
    console.log(`Precision = ${precision.toFixed(3)}`);
    console.log(`Recall = ${recall.toFixed(3)}`);
    const resultsPath = path.join(process.cwd(), 'benchmark', 'RESULTS.md');
    fs.writeFileSync(resultsPath, buildResultsMarkdown(results, new Date().toISOString()), 'utf-8');
    console.log('');
    console.log(`Wrote ${resultsPath}`);
}
main();

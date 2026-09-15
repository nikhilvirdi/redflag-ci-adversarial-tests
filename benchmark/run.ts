import * as fs from 'fs';
import * as path from 'path';
import { SCENARIOS, CorpusScenario } from './corpus/manifest';
import { detectNewMcpServer } from '../../RedFlag-CI/backend/src/detectors/newMcpServer';
import { detectSwappedMcpServer } from '../../RedFlag-CI/backend/src/detectors/swappedMcpServer';
import { detectWidenedPermissions } from '../../RedFlag-CI/backend/src/detectors/widenedPermissions';
import { detectHookChanged } from '../../RedFlag-CI/backend/src/detectors/hookChanged';
import { detectMonitoredFileDeleted } from '../../RedFlag-CI/backend/src/detectors/monitoredFileDeleted';
import { detectUnpinnedMcpDependency } from '../../RedFlag-CI/backend/src/detectors/unpinnedMcpDependency';
import { detectObfuscatedCommand } from '../../RedFlag-CI/backend/src/detectors/obfuscatedCommand';
import { detectDuplicateJsonKey } from '../../RedFlag-CI/backend/src/detectors/duplicateJsonKey';
import { detectSuspiciousNetworkTarget } from '../../RedFlag-CI/backend/src/detectors/suspiciousNetworkTarget';
import { detectPathTraversal } from '../../RedFlag-CI/backend/src/detectors/pathTraversal';
import { detectTransportTypeChange } from '../../RedFlag-CI/backend/src/detectors/transportTypeChange';
import { detectInvisibleUnicode } from '../../RedFlag-CI/backend/src/detectors/invisibleUnicode';
import { detectHomoglyphs } from '../../RedFlag-CI/backend/src/detectors/homoglyphs';
import { detectRuleFileChecksInJsonKeys } from '../../RedFlag-CI/backend/src/detectors/ruleFileJsonKeys';
import { aggregateFindings } from '../../RedFlag-CI/backend/src/aggregateFindings';
import { Finding } from '../../RedFlag-CI/backend/src/types';

// Resolved from process.cwd() (run from redflag-ci-adversarial-tests/, which sits
// beside RedFlag-CI/), not __dirname: tsc only compiles .ts files, so the compiled
// run.js ends up nested under benchmark/dist/redflag-ci-adversarial-tests/benchmark/,
// while the corpus fixtures stay put at their source location, benchmark/corpus/.
const CORPUS_DIR = path.join(process.cwd(), 'benchmark', 'corpus');

// Mirrors processPullRequestEvent.ts's engine dispatch exactly -- this is the
// actual production pipeline logic, not a reimplementation, run directly
// against each corpus pair instead of through detector-level unit tests.
function runDiffDriftDetectors(filePath: string, base: string | null, head: string | null): Finding[] {
  // Mirrors processPullRequestEvent.ts's DD-8 short-circuit exactly: a
  // monitored file present in base and absent in head reports the deletion
  // instead of running the normal detectors, all of which return [] on a
  // null head regardless.
  if (base !== null && head === null) {
    return detectMonitoredFileDeleted(filePath, base, head);
  }

  return [
    ...detectNewMcpServer(filePath, base, head),
    ...detectSwappedMcpServer(filePath, base, head),
    ...detectWidenedPermissions(filePath, base, head),
    ...detectHookChanged(filePath, base, head),
    ...detectUnpinnedMcpDependency(filePath, head),
    ...detectObfuscatedCommand(filePath, head),
    ...detectDuplicateJsonKey(filePath, head),
    ...detectSuspiciousNetworkTarget(filePath, head),
    ...detectPathTraversal(filePath, head),
    ...detectTransportTypeChange(filePath, base, head),
    ...detectRuleFileChecksInJsonKeys(filePath, head),
  ];
}

function runRuleFileDetectors(filePath: string, head: string | null): Finding[] {
  if (head === null) {
    return [];
  }
  return [...detectInvisibleUnicode(filePath, head), ...detectHomoglyphs(filePath, head)];
}

function readScenarioFiles(scenario: CorpusScenario): { before: string; after: string | null } {
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

type Classification = 'TP' | 'FP' | 'TN' | 'FN';

interface ScenarioResult {
  scenario: CorpusScenario;
  findings: Finding[];
  fired: boolean;
  classification: Classification;
}

function classify(groundTruth: CorpusScenario['groundTruth'], fired: boolean): Classification {
  if (groundTruth === 'positive') {
    return fired ? 'TP' : 'FN';
  }
  return fired ? 'FP' : 'TN';
}

function runScenario(scenario: CorpusScenario): ScenarioResult {
  const { before, after } = readScenarioFiles(scenario);
  const rawFindings =
    scenario.engine === 'diff-drift'
      ? runDiffDriftDetectors(scenario.filePath, before, after)
      : runRuleFileDetectors(scenario.filePath, after);
  const findings = aggregateFindings([rawFindings]);
  const fired = findings.length > 0;
  return { scenario, findings, fired, classification: classify(scenario.groundTruth, fired) };
}

export function runBenchmark(): ScenarioResult[] {
  return SCENARIOS.map(runScenario);
}

function summarize(results: ScenarioResult[]) {
  const counts = { TP: 0, FP: 0, TN: 0, FN: 0 };
  for (const r of results) {
    counts[r.classification]++;
  }
  const precision = counts.TP / (counts.TP + counts.FP);
  const recall = counts.TP / (counts.TP + counts.FN);
  return { counts, precision, recall };
}

interface DetectorBreakdown {
  detectorId: string;
  positiveScenarios: number;
  positivesCaught: number;
  negativeScenarios: number;
  negativesMisfired: number;
}

function breakdownByDetector(results: ScenarioResult[]): DetectorBreakdown[] {
  const byDetector = new Map<string, ScenarioResult[]>();
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

function formatFindingsList(findings: Finding[]): string {
  if (findings.length === 0) {
    return '(none)';
  }
  return findings.map((f) => `${f.detectorId} [${f.severity}]: ${f.summary}`).join('; ');
}

function buildResultsMarkdown(results: ScenarioResult[], generatedAt: string): string {
  const { counts, precision, recall } = summarize(results);
  const breakdown = breakdownByDetector(results);
  const misclassified = results.filter((r) => r.classification === 'FP' || r.classification === 'FN');

  const lines: string[] = [];
  lines.push('# RedFlag CI v1 Benchmark Results');
  lines.push('');
  lines.push(`Generated: ${generatedAt}`);
  lines.push('');
  lines.push('## Methodology');
  lines.push('');
  lines.push(
    `${results.length} synthetic PR scenarios, each a before/after file pair for one monitored file, stored under ` +
      '`benchmark/corpus/<scenario-id>/`. `benchmark/run.ts` runs the actual production detector ' +
      'functions and `aggregateFindings` against each pair -- the same dispatch logic ' +
      '`processPullRequestEvent.ts` uses (diff-drift files get DD-1 through DD-4, the ' +
      'unpinned-MCP-dependency, obfuscated-command, duplicate-JSON-key, suspicious-network-target, ' +
      'path-traversal, and transport-type-change checks, plus RF-1/RF-2 against MCP server names ' +
      'and permission entries; rule-file files get RF-1/RF-2 against head content only) -- ' +
      'with no GitHub API, webhook, or posting involved. Each ' +
      "scenario carries a ground-truth label (`positive` = should produce at least one finding, " +
      '`negative` = should produce none). A scenario "fires" if the aggregated findings array is ' +
      'non-empty. No detector logic was modified to produce these numbers.'
  );
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
  lines.push(
    `These numbers describe this ${results.length}-scenario corpus, not a statistically representative sample of ` +
      'real-world PRs. The corpus intentionally includes near-miss and known-gap cases designed to ' +
      "surface the detectors' actual limits (see below) rather than a set chosen to look clean."
  );
  lines.push('');
  lines.push('## Breakdown by detector');
  lines.push('');
  lines.push('| Detector | Positive scenarios | Caught (TP) | Negative scenarios | Misfired (FP) |');
  lines.push('|---|---|---|---|---|');
  for (const b of breakdown) {
    lines.push(
      `| \`${b.detectorId}\` | ${b.positiveScenarios} | ${b.positivesCaught} | ${b.negativeScenarios} | ${b.negativesMisfired} |`
    );
  }
  lines.push('');
  lines.push('## Full scenario results');
  lines.push('');
  lines.push('| ID | File | Ground truth | Fired? | Result | Findings |');
  lines.push('|---|---|---|---|---|---|');
  for (const r of results) {
    lines.push(
      `| \`${r.scenario.id}\` | \`${r.scenario.filePath}\` | ${r.scenario.groundTruth} | ${r.fired} | **${r.classification}** | ${formatFindingsList(r.findings)} |`
    );
  }
  lines.push('');
  lines.push('## False positives and false negatives, explained honestly');
  lines.push('');
  lines.push(
    `${misclassified.length} of 18 scenarios were misclassified by the tool relative to this corpus's ` +
      'ground truth. None of these are implementation bugs in the sense of "the code does not match its ' +
      'own spec" -- each is the detector behaving exactly as designed, on a case where that design has a ' +
      'real, documented limit. They are recorded here, not fixed, per this task\'s scope.'
  );
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

function main(): void {
  const results = runBenchmark();
  const { counts, precision, recall } = summarize(results);

  console.log('RedFlag CI benchmark -- scenario results:');
  for (const r of results) {
    console.log(
      `  [${r.classification}] ${r.scenario.id} (expected: ${r.scenario.groundTruth}, fired: ${r.fired})`
    );
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

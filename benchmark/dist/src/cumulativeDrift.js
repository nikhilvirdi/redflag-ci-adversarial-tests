"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectCumulativeDrift = detectCumulativeDrift;
const newMcpServer_1 = require("./detectors/newMcpServer");
const swappedMcpServer_1 = require("./detectors/swappedMcpServer");
const widenedPermissions_1 = require("./detectors/widenedPermissions");
const hookChanged_1 = require("./detectors/hookChanged");
const transportTypeChange_1 = require("./detectors/transportTypeChange");
// Task A.3: the same base/head-comparing diff-drift detectors
// processPullRequestEvent.ts already runs against the PR's immediate base,
// run again with the stored baseline as "base" instead. Current-state
// detectors (unpinned dependency, obfuscated command, duplicate key,
// suspicious network target, path traversal, RF-1/RF-2-on-JSON-keys) are
// deliberately excluded: they only ever look at head content regardless of
// what "base" they're given, so re-running them here would just reproduce
// the exact same findings the immediate comparison already computed --
// nothing to gain, only duplicate work.
function runBaseHeadDetectors(filePath, base, head) {
    return [
        ...(0, newMcpServer_1.detectNewMcpServer)(filePath, base, head),
        ...(0, swappedMcpServer_1.detectSwappedMcpServer)(filePath, base, head),
        ...(0, widenedPermissions_1.detectWidenedPermissions)(filePath, base, head),
        ...(0, hookChanged_1.detectHookChanged)(filePath, base, head),
        ...(0, transportTypeChange_1.detectTransportTypeChange)(filePath, base, head),
    ];
}
// Two findings are "the same" for dedup purposes if they share a detector,
// a file, and a summary -- summary already names the specific entry
// (server/permission/hook) a finding is about, so this is precise without
// needing to compare full detail text.
function findingKey(finding) {
    return `${finding.detectorId}|${finding.file}|${finding.summary}`;
}
// Compares the current PR's head content against the stored baseline (the
// state as of the last merge -- which, since the baseline updates on every
// merge, already reflects every merge before it, not only the one
// immediately preceding this PR) and returns only the findings that
// surfaces beyond what comparing against the immediate base already found.
// This is what catches the adversarial-gradual-drift-two-prs pattern: two
// small, individually unremarkable widenings across two separate merged
// PRs, each invisible to a single-PR-scoped check, become visible once
// compared against a baseline that predates both -- but a PR whose own
// immediate-base comparison already reports everything the baseline
// comparison would (the common case: a normal PR with no accumulated prior
// drift) gets no duplicate findings out of this.
function detectCumulativeDrift(filePath, baselineContent, headContent, alreadyReported) {
    const cumulative = runBaseHeadDetectors(filePath, baselineContent, headContent);
    const seen = new Set(alreadyReported.map(findingKey));
    return cumulative.filter((finding) => !seen.has(findingKey(finding)));
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.processPullRequestEvent = processPullRequestEvent;
const githubApp_1 = require("./githubApp");
const monitoredFiles_1 = require("./monitoredFiles");
const fileVersions_1 = require("./fileVersions");
const newMcpServer_1 = require("./detectors/newMcpServer");
const swappedMcpServer_1 = require("./detectors/swappedMcpServer");
const widenedPermissions_1 = require("./detectors/widenedPermissions");
const hookChanged_1 = require("./detectors/hookChanged");
const monitoredFileDeleted_1 = require("./detectors/monitoredFileDeleted");
const unpinnedMcpDependency_1 = require("./detectors/unpinnedMcpDependency");
const obfuscatedCommand_1 = require("./detectors/obfuscatedCommand");
const duplicateJsonKey_1 = require("./detectors/duplicateJsonKey");
const suspiciousNetworkTarget_1 = require("./detectors/suspiciousNetworkTarget");
const pathTraversal_1 = require("./detectors/pathTraversal");
const transportTypeChange_1 = require("./detectors/transportTypeChange");
const invisibleUnicode_1 = require("./detectors/invisibleUnicode");
const homoglyphs_1 = require("./detectors/homoglyphs");
const ruleFileJsonKeys_1 = require("./detectors/ruleFileJsonKeys");
const aggregateFindings_1 = require("./aggregateFindings");
const postFindings_1 = require("./postFindings");
const baselineUpdate_1 = require("./baselineUpdate");
const baseline_1 = require("./baseline");
const cumulativeDrift_1 = require("./cumulativeDrift");
const PROCESSED_ACTIONS = new Set(['opened', 'synchronize']);
// Untrusted webhook payload: only proceed on an opened/synchronize
// pull_request event that has every field the rest of the pipeline needs.
// Anything else (other event types, other actions, malformed bodies) is
// silently ignored, matching architecture.md's fail-open, quiet-by-default
// stance rather than erroring on shapes we don't recognize.
function parsePullRequestEvent(payload) {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }
    const p = payload;
    const action = p.action;
    const owner = p.repository?.owner?.login;
    const repo = p.repository?.name;
    const pullNumber = p.pull_request?.number;
    const headSha = p.pull_request?.head?.sha;
    const baseSha = p.pull_request?.base?.sha;
    const installationId = p.installation?.id;
    if (typeof action !== 'string' ||
        !PROCESSED_ACTIONS.has(action) ||
        typeof owner !== 'string' ||
        typeof repo !== 'string' ||
        typeof pullNumber !== 'number' ||
        typeof headSha !== 'string' ||
        typeof baseSha !== 'string' ||
        typeof installationId !== 'number') {
        return null;
    }
    return { owner, repo, pullNumber, headSha, baseRef: baseSha, headRef: headSha, installationId };
}
// Task A.2: the baseline must update only on an actual merge, never on
// open/synchronize, and never for a PR that was closed without merging (an
// unmerged PR must never influence the stored baseline, even indirectly).
//
// Signal chosen: the pull_request webhook event, action "closed" with
// pull_request.merged === true -- not a push event to the base branch.
// A push event fires for ANY commit landing on that branch (a direct push,
// a force-push, a merge done outside a reviewed PR), not only a genuine PR
// merge, and carries no PR number to correlate back to one; distinguishing
// "was this actually a merged PR" from "something else changed this branch"
// would mean re-deriving the same signal pull_request/closed already gives
// directly. The merge commit's own SHA (merge_commit_sha) is used as the
// ref to snapshot, not the base branch name, so a second merge landing
// between event delivery and this handler running can't shift what gets
// captured out from under it.
function parseMergeEvent(payload) {
    if (typeof payload !== 'object' || payload === null) {
        return null;
    }
    const p = payload;
    if (p.action !== 'closed' || p.pull_request?.merged !== true) {
        return null;
    }
    const owner = p.repository?.owner?.login;
    const repo = p.repository?.name;
    const mergeCommitSha = p.pull_request?.merge_commit_sha;
    const installationId = p.installation?.id;
    if (typeof owner !== 'string' ||
        typeof repo !== 'string' ||
        typeof mergeCommitSha !== 'string' ||
        typeof installationId !== 'number') {
        return null;
    }
    return { owner, repo, mergeCommitSha, installationId };
}
function runDiffDriftDetectors(filePath, base, head) {
    // DD-8 fires instead of the normal detectors below when the file existed
    // in base and is gone in head: every one of them independently (and
    // correctly) returns [] on a null head, since there's nothing left to scan
    // -- but that leaves the deletion itself, the most severe possible change,
    // completely unreported. See detectors/monitoredFileDeleted.ts.
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
async function processPullRequestEvent(githubApp, payload) {
    const mergeEvent = parseMergeEvent(payload);
    if (mergeEvent) {
        await (0, baselineUpdate_1.updateBaselineOnMerge)(githubApp, mergeEvent);
        return;
    }
    const event = parsePullRequestEvent(payload);
    if (!event) {
        return;
    }
    const { owner, repo, pullNumber, headSha, baseRef, headRef, installationId } = event;
    const changedFiles = await (0, githubApp_1.getChangedFiles)(githubApp, { installationId, owner, repo, pullNumber });
    const { matches } = (0, monitoredFiles_1.filterMonitoredFiles)(changedFiles);
    let findings = [];
    let cumulativeFindings = [];
    if (matches.length > 0) {
        const octokit = await githubApp.getInstallationOctokit(installationId);
        // Task A.3: fail-open by construction -- readBaseline already collapses
        // a missing baseline branch, a missing file, malformed content, or any
        // other API failure to null, so a repo with no baseline yet (or one
        // RedFlag CI temporarily can't reach) falls straight through to today's
        // stateless, single-PR comparison below with no special-casing needed
        // here.
        const baseline = await (0, baseline_1.readBaseline)(octokit, { owner, repo });
        const resultsByFile = await Promise.all(matches.map(async (match) => {
            const { base, head } = await (0, fileVersions_1.getFileVersions)(githubApp, {
                installationId,
                owner,
                repo,
                path: match.path,
                baseRef,
                headRef,
            });
            const immediateFindings = match.engine === 'diff-drift'
                ? runDiffDriftDetectors(match.path, base, head)
                : runRuleFileDetectors(match.path, head);
            // Cumulative drift only applies to diff-drift files with a known
            // baseline entry; a file the baseline has never captured (new to
            // this repo's monitored set, or the baseline predates it) has
            // nothing to compare against beyond what's already above.
            const baselineContent = baseline?.files[match.path];
            if (match.engine !== 'diff-drift' || baselineContent === undefined) {
                return { immediateFindings, cumulativeFindings: [] };
            }
            // Task A.6: kept separate from immediateFindings, not merged in --
            // these need their own distinct section in the PR comment (built by
            // postFindings/formatCumulativeDriftSection below), not to blend
            // invisibly into the main list as if they were part of this PR's
            // own diff.
            const cumulativeFindings = (0, cumulativeDrift_1.detectCumulativeDrift)(match.path, baselineContent, head, immediateFindings);
            return { immediateFindings, cumulativeFindings };
        }));
        findings = (0, aggregateFindings_1.aggregateFindings)(resultsByFile.map((r) => r.immediateFindings));
        cumulativeFindings = (0, aggregateFindings_1.aggregateFindings)(resultsByFile.map((r) => r.cumulativeFindings));
    }
    const octokit = await githubApp.getInstallationOctokit(installationId);
    await (0, postFindings_1.postFindings)(octokit, { owner, repo, pullNumber, headSha, findings, cumulativeFindings });
}

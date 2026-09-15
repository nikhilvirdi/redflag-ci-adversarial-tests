"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateBaselineOnMerge = updateBaselineOnMerge;
const fileVersions_1 = require("./fileVersions");
const monitoredFiles_1 = require("./monitoredFiles");
const baseline_1 = require("./baseline");
// Task A.2: fetches every diff-drift monitored path at the merge commit --
// not just whichever ones this particular PR touched -- so the baseline
// always reflects the repo's full current state. A PR that only changes
// .mcp.json must not cause .claude/settings.json's previously-known
// permissions/hooks to silently drop out of the baseline. Any path that
// doesn't exist in this repo (getFileAtRef returns null, a 404) is simply
// absent from the snapshot, same as buildSnapshot's own empty-map default.
async function updateBaselineOnMerge(githubApp, event) {
    const { owner, repo, mergeCommitSha, installationId } = event;
    const contents = await Promise.all(monitoredFiles_1.DIFF_DRIFT_FILES.map((path) => (0, fileVersions_1.getFileAtRef)(githubApp, { installationId, owner, repo, path, ref: mergeCommitSha })));
    const files = {};
    monitoredFiles_1.DIFF_DRIFT_FILES.forEach((path, i) => {
        const content = contents[i];
        if (content !== null) {
            files[path] = content;
        }
    });
    const snapshot = (0, baseline_1.buildSnapshot)(files);
    const octokit = await githubApp.getInstallationOctokit(installationId);
    await (0, baseline_1.writeBaseline)(octokit, { owner, repo, snapshot });
    // Task A.4: checked here, right after the branch we just depended on --
    // not on every webhook event, since protection status rarely changes and
    // this project has no periodic/background job infrastructure to run it
    // separately (architecture.md section 7: stateless, no queue). Never
    // allowed to affect whether the write above succeeded; this is purely
    // observability on top of it.
    await (0, baseline_1.checkBaselineBranchProtection)(octokit, owner, repo);
}

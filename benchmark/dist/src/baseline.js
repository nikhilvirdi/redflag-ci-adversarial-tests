"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BASELINE_BRANCH = void 0;
exports.computeSnapshotHash = computeSnapshotHash;
exports.buildSnapshot = buildSnapshot;
exports.readBaseline = readBaseline;
exports.writeBaseline = writeBaseline;
exports.checkBaselineBranchProtection = checkBaselineBranchProtection;
const crypto_1 = require("crypto");
const logger_1 = require("./logger");
exports.BASELINE_BRANCH = 'redflag-ci/baseline';
const BASELINE_FILE_PATH = 'baseline.json';
function computeSnapshotHash(snapshot) {
    return (0, crypto_1.createHash)('sha256').update(JSON.stringify(snapshot)).digest('hex');
}
function isValidStoredBaseline(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    return typeof obj.contentHash === 'string' && isValidSnapshot(obj.snapshot);
}
// Pure: no Octokit, no I/O. Builds the snapshot that gets written after a
// merge from whatever monitored diff-drift file contents the caller already
// fetched (A.2's job -- gathering those is webhook-event-shaped work, kept
// out of this module per the task's "isolated from webhook logic" scope).
function buildSnapshot(files) {
    return {
        version: 1,
        updatedAt: new Date().toISOString(),
        files: { ...files },
    };
}
function isNotFoundError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404);
}
// Task #10 addendum: writeBaseline/buildSnapshot never validate that a
// monitored file's raw content is parseable JSON before storing it -- they
// store whatever text getFileAtRef fetched, verbatim (see buildSnapshot's
// own doc comment: "the exact content it was handed"). So a merge landing
// with an already-unparseable monitored file leaves the stored baseline
// holding malformed content under a perfectly VALID hash, since the hash is
// computed over that same malformed string -- no tampering occurred, so the
// integrity check above has nothing to catch. Without this check, that
// snapshot would be returned as a normal, valid result, and the eventual
// fail-open would happen silently, one layer down, inside whichever
// individual detector's own JSON.parse try/catch runs against it during
// cumulative-drift comparison -- unlike every other fail-open path in this
// file, with no log line anywhere marking that it happened.
function findUnparseableFile(snapshot) {
    for (const [path, content] of Object.entries(snapshot.files)) {
        try {
            JSON.parse(content);
        }
        catch {
            return path;
        }
    }
    return null;
}
function isValidSnapshot(value) {
    if (typeof value !== 'object' || value === null) {
        return false;
    }
    const obj = value;
    if (obj.version !== 1 || typeof obj.updatedAt !== 'string') {
        return false;
    }
    if (typeof obj.files !== 'object' || obj.files === null || Array.isArray(obj.files)) {
        return false;
    }
    return Object.values(obj.files).every((v) => typeof v === 'string');
}
// Fail-open by design (architecture.md section 2, extended to baseline
// infrastructure by this task): a missing branch, a missing file, malformed
// JSON, a failed integrity check, or any other API failure all collapse to
// `null` here, not a thrown error. The caller's job is to fall back to
// today's stateless base/head comparison when this returns null, never to
// block a PR because the baseline isn't available -- a tampered snapshot is
// treated exactly like an unavailable one for that purpose (Task A.5: it is
// specifically NOT trusted and used anyway just because a hash exists;
// distinguishing "tampered" from "unavailable" is done only in the log
// below, not in what the caller receives).
async function readBaseline(octokit, request) {
    const { owner, repo, branch = exports.BASELINE_BRANCH } = request;
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: BASELINE_FILE_PATH,
            ref: branch,
        });
        if (Array.isArray(data) || data.type !== 'file') {
            return null;
        }
        const raw = Buffer.from(data.content, 'base64').toString('utf-8');
        const parsed = JSON.parse(raw);
        if (!isValidStoredBaseline(parsed)) {
            return null;
        }
        // Task A.5: same distinct-logging pattern as Task 6.3's rate-limit
        // handling -- a hash mismatch is a specific, named condition, not folded
        // into a generic "couldn't read the baseline" silence. It means the
        // stored content changed outside writeBaseline's own write path (e.g. a
        // direct push to the branch, which A.4's protection check exists to
        // catch happening at all), so it's a tampering signal, not ordinary
        // unavailability.
        if (computeSnapshotHash(parsed.snapshot) !== parsed.contentHash) {
            logger_1.logger.warn('Baseline snapshot integrity hash mismatch -- possible tampering outside the normal update flow', {
                owner,
                repo,
                branch,
            });
            return null;
        }
        // Same distinct-logging principle as the hash-mismatch check above,
        // applied to a different failure mode: the wrapper is genuinely
        // untampered (the hash matches), but a stored file's own content isn't
        // usable JSON. Treated the same as any other unusable baseline -- fail
        // open, don't use it -- but now observable instead of silent.
        const unparseablePath = findUnparseableFile(parsed.snapshot);
        if (unparseablePath !== null) {
            logger_1.logger.warn('Baseline snapshot contains unparseable file content -- a prior merge may have captured invalid JSON; falling back to stateless comparison', {
                owner,
                repo,
                branch,
                path: unparseablePath,
            });
            return null;
        }
        return parsed.snapshot;
    }
    catch (error) {
        // Task 6.3's same distinct-logging principle, applied to the baseline
        // read: a 404 means no baseline has ever been written yet (the ordinary
        // case on a repo's first merge past this feature's install, or a custom
        // branch that was never created) and stays silent -- that's the expected
        // steady state, not a failure. Anything else -- rate-limited,
        // permission-denied, a network failure, GitHub API downtime -- means
        // RedFlag CI never actually got to check, which looks identical to "no
        // baseline yet" from the caller's null return value alone unless the
        // logs say otherwise.
        if (!isNotFoundError(error)) {
            const message = error instanceof Error ? error.message : String(error);
            logger_1.logger.warn('Failed to read baseline snapshot; falling back to stateless comparison', {
                owner,
                repo,
                branch,
                message,
            });
        }
        return null;
    }
}
// The baseline branch won't exist on a repo's first-ever merge past this
// feature's install; created off the default branch's current HEAD rather
// than as an orphan branch -- simpler (one extra API call, no raw git-object
// plumbing for a parentless commit) and the branch's ancestry doesn't matter
// for a file that gets wholly overwritten on every write.
async function ensureBaselineBranchExists(octokit, owner, repo, branch) {
    try {
        await octokit.rest.git.getRef({ owner, repo, ref: `heads/${branch}` });
        return;
    }
    catch (error) {
        if (!isNotFoundError(error)) {
            throw error;
        }
    }
    const { data: repoInfo } = await octokit.rest.repos.get({ owner, repo });
    const { data: defaultBranchRef } = await octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${repoInfo.default_branch}`,
    });
    await octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${branch}`,
        sha: defaultBranchRef.object.sha,
    });
}
async function writeBaseline(octokit, request) {
    const { owner, repo, snapshot, branch = exports.BASELINE_BRANCH } = request;
    await ensureBaselineBranchExists(octokit, owner, repo, branch);
    let sha;
    try {
        const { data } = await octokit.rest.repos.getContent({
            owner,
            repo,
            path: BASELINE_FILE_PATH,
            ref: branch,
        });
        if (!Array.isArray(data) && data.type === 'file') {
            sha = data.sha;
        }
    }
    catch (error) {
        if (!isNotFoundError(error)) {
            throw error;
        }
    }
    const stored = { snapshot, contentHash: computeSnapshotHash(snapshot) };
    try {
        await octokit.rest.repos.createOrUpdateFileContents({
            owner,
            repo,
            path: BASELINE_FILE_PATH,
            branch,
            message: 'redflag-ci: update baseline snapshot',
            content: Buffer.from(JSON.stringify(stored, null, 2)).toString('base64'),
            sha,
        });
    }
    catch (error) {
        // Finding #11: a conflicting (stale sha, concurrent write) or otherwise
        // failed baseline write is not retried -- no queue, no backoff. The
        // baseline is a full snapshot, not an incremental diff, so the very
        // next successful merge overwrites it wholesale and the stored state
        // self-heals on its own; the same reasoning readBaseline's Task #10 fix
        // already applies on the read side. Logging, not retrying, is the
        // correct response to a failure this shape self-heals, and it must
        // never block the merge event that triggered this write -- caught here
        // rather than left to propagate, so a stale-sha conflict on the
        // baseline branch can't fail the whole webhook delivery.
        const message = error instanceof Error ? error.message : String(error);
        logger_1.logger.warn('Failed to write baseline snapshot; next successful merge will self-heal', {
            owner,
            repo,
            branch,
            message,
        });
    }
}
// Task A.4: A.2's merge-only update path is the only way the baseline is
// *meant* to change; an unprotected branch could be pushed to directly,
// bypassing it entirely (e.g. seeding a false "known good" state to hide
// drift, or wiping the baseline outright). This only ever logs a warning,
// never blocks anything -- fixing the branch's own protection settings is a
// repo-admin action outside RedFlag CI's own permission scope
// (architecture.md section 2's least-privilege principle), not something
// this tool can or should silently correct on someone's behalf.
//
// repos.getBranch (not the admin-only repos.getBranchProtection) is used
// deliberately: its response includes a plain `protected` boolean available
// to any caller with read access, so this check can't itself fail just
// because the installation lacks admin permissions on the repo.
async function checkBaselineBranchProtection(octokit, owner, repo, branch = exports.BASELINE_BRANCH) {
    try {
        const { data } = await octokit.rest.repos.getBranch({ owner, repo, branch });
        if (!data.protected) {
            logger_1.logger.warn('Baseline branch has no branch protection enabled', { owner, repo, branch });
        }
    }
    catch (error) {
        // Fail-open (architecture.md section 2): being unable to verify
        // protection status (branch not found, API error, etc.) is itself
        // worth logging distinctly, but never throws out of this check.
        const message = error instanceof Error ? error.message : String(error);
        logger_1.logger.warn('Could not verify baseline branch protection status', { owner, repo, branch, message });
    }
}

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.postFindings = postFindings;
const formatFindingsComment_1 = require("./formatFindingsComment");
const logger_1 = require("./logger");
const CHECK_RUN_NAME = 'RedFlag CI';
// Stable marker embedded in every comment RedFlag CI posts, so a later run
// on the same PR (a `synchronize` push) can find its own prior comment and
// edit it instead of piling up a new one per push.
const COMMENT_MARKER = '<!-- redflag-ci -->';
// Finding #8: guards against two webhook deliveries for the same PR running
// postFindings concurrently (e.g. two rapid `synchronize` pushes) and both
// calling findExistingCommentId before either has written one -- the exact
// duplicate Task 6.1's idempotency check exists to prevent, just reached via
// a race instead of a missing lookup. Same in-memory-Set shape as app.ts's
// Task 6.2 delivery dedup, but unbounded and self-clearing rather than
// capped at a fixed size: a key is only ever held for the duration of one
// in-flight call (added at the start, removed in a `finally` even on
// error), never accumulated as a permanent log the way delivery IDs are, so
// there's nothing to bound.
//
// Single-instance-process lock only: this Set lives in this process's own
// memory. It provides zero protection across multiple replicas of this
// service -- a second instance's postFindings call cannot see this one's
// lock at all, and can still race with it. Cross-instance safety would need
// a distributed lock or DB-backed mutex, both explicitly out of scope for
// this stateless-service design (architecture.md section 2), the same
// reasoning that already puts durable delivery dedup out of scope until v2.
const inFlight = new Set();
function prLockKey(owner, repo, pullNumber) {
    return `${owner}/${repo}#${pullNumber}`;
}
async function findExistingCommentId(octokit, owner, repo, pullNumber) {
    // ponytail: single page (100 comments), no pagination loop. Upgrade to
    // paginate() if a PR ever collects >100 comments before RedFlag CI's first.
    const { data: comments } = await octokit.rest.issues.listComments({
        owner,
        repo,
        issue_number: pullNumber,
        per_page: 100,
    });
    const existing = comments.find((comment) => comment.body?.includes(COMMENT_MARKER));
    return existing?.id ?? null;
}
// GitHub's Checks API has no upsert semantics: POST /check-runs always
// creates a brand-new check run, even when one already exists with the same
// name for the same SHA (confirmed against the Octokit REST types — `create`
// is POST /check-runs, `update` is a separate PATCH by check_run_id). So,
// same as the comment, we look for a prior run before deciding create vs.
// update.
async function findExistingCheckRunId(octokit, owner, repo, headSha) {
    const { data } = await octokit.rest.checks.listForRef({
        owner,
        repo,
        ref: headSha,
        check_name: CHECK_RUN_NAME,
    });
    return data.check_runs[0]?.id ?? null;
}
// architecture.md section 6: a comment posts only when there's at least one
// finding; the check run conclusion is "neutral" (findings present) or
// "success" (none) and is never "failure" — RedFlag CI never blocks a PR.
// Task A.6: cumulativeFindings counts toward that decision exactly like
// findings does -- drift that's only visible against the baseline is still
// a real finding, not a lesser one, so it still flips the check to neutral
// and still posts a comment even if this PR's own diff alone found nothing.
async function postFindings(octokit, request) {
    const { owner, repo, pullNumber, headSha, findings, cumulativeFindings = [] } = request;
    const lockKey = prLockKey(owner, repo, pullNumber);
    if (inFlight.has(lockKey)) {
        logger_1.logger.warn('Skipping postFindings: already in flight for this PR', { owner, repo, pullNumber });
        return;
    }
    inFlight.add(lockKey);
    try {
        const hasFindings = findings.length > 0 || cumulativeFindings.length > 0;
        if (hasFindings) {
            const sections = [(0, formatFindingsComment_1.formatFindingsComment)(findings), (0, formatFindingsComment_1.formatCumulativeDriftSection)(cumulativeFindings)].filter(Boolean);
            const body = `${sections.join('\n\n')}\n\n${COMMENT_MARKER}`;
            const existingCommentId = await findExistingCommentId(octokit, owner, repo, pullNumber);
            if (existingCommentId !== null) {
                await octokit.rest.issues.updateComment({ owner, repo, comment_id: existingCommentId, body });
            }
            else {
                await octokit.rest.issues.createComment({ owner, repo, issue_number: pullNumber, body });
            }
        }
        else {
            // A prior comment on this PR was reporting findings that no longer
            // exist as of this push -- left alone, it would show stale, resolved
            // findings indefinitely. Edited in place, same as the findings-present
            // branch above; never created fresh here, so a PR that never had a
            // comment (the common case) still gets none, unchanged.
            const existingCommentId = await findExistingCommentId(octokit, owner, repo, pullNumber);
            if (existingCommentId !== null) {
                const body = `${(0, formatFindingsComment_1.formatResolvedComment)()}\n\n${COMMENT_MARKER}`;
                await octokit.rest.issues.updateComment({ owner, repo, comment_id: existingCommentId, body });
            }
        }
        const conclusion = hasFindings ? 'neutral' : 'success';
        const existingCheckRunId = await findExistingCheckRunId(octokit, owner, repo, headSha);
        if (existingCheckRunId !== null) {
            await octokit.rest.checks.update({
                owner,
                repo,
                check_run_id: existingCheckRunId,
                status: 'completed',
                conclusion,
            });
        }
        else {
            await octokit.rest.checks.create({
                owner,
                repo,
                name: CHECK_RUN_NAME,
                head_sha: headSha,
                status: 'completed',
                conclusion,
            });
        }
    }
    finally {
        inFlight.delete(lockKey);
    }
}

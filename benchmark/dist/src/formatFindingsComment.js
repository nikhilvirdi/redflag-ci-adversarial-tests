"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatFindingsComment = formatFindingsComment;
exports.formatResolvedComment = formatResolvedComment;
exports.formatCumulativeDriftSection = formatCumulativeDriftSection;
const SEVERITY_LABEL = {
    high: 'HIGH',
    warning: 'WARNING',
    info: 'INFO',
};
function formatFindingBullet(finding) {
    return `- **${SEVERITY_LABEL[finding.severity]}** \`${finding.file}\`: ${finding.summary}. ${finding.detail}`;
}
// Returns '' for an empty findings list. architecture.md section 6: a comment
// only posts when there's at least one finding; Task 5.3's posting logic
// decides whether to post based on this return value.
function formatFindingsComment(findings) {
    if (findings.length === 0) {
        return '';
    }
    const noun = findings.length === 1 ? 'issue' : 'issues';
    const lines = findings.map(formatFindingBullet);
    return [`**RedFlag CI found ${findings.length} ${noun}:**`, '', ...lines].join('\n');
}
// postFindings.ts's resolved-state edit path: a prior comment already
// exists on the PR (it was posted when an earlier push had findings), but
// the latest push has none. Left untouched, that comment would keep
// showing stale, now-resolved findings indefinitely -- this replaces it
// with a short message in the opposite shape of formatFindingsComment's
// bulleted list above, so a reader can tell at a glance the comment is
// reporting a clean state, not just an unusually short findings list.
// Never used to create a brand-new comment: matching this project's
// "quiet by default" stance (README), a PR with no prior comment and no
// findings still gets no comment at all.
function formatResolvedComment() {
    return ('**RedFlag CI: previously flagged issues have been resolved.** ' +
        'No findings on the latest push.');
}
// Task A.6: renders as its own distinct section, not folded into the main
// list above -- these findings only show up by comparing against the
// stored baseline (Task A.3), not this PR's own base/head diff, so calling
// them out separately is the point: "this looks widened" alone doesn't tell
// a reviewer the change isn't even visible in their own PR's diff. Reuses
// the exact same bullet format as formatFindingsComment above.
function formatCumulativeDriftSection(cumulativeFindings) {
    if (cumulativeFindings.length === 0) {
        return '';
    }
    const noun = cumulativeFindings.length === 1 ? 'change' : 'changes';
    const lines = cumulativeFindings.map(formatFindingBullet);
    return [
        `**${cumulativeFindings.length} additional ${noun} found since the last known-good baseline** ` +
            "(accumulated drift from prior merges, not part of this PR's own diff):",
        '',
        ...lines,
    ].join('\n');
}

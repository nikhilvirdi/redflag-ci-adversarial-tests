"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectMonitoredFileDeleted = detectMonitoredFileDeleted;
// DD-8: a monitored diff-drift file (holding MCP server, permission, and/or
// hook definitions) is deleted outright between base and head. DD-1 through
// DD-7 all correctly return [] when headContent is null -- there's no head
// content left to scan for a new server, a widened permission, or a changed
// hook, and that per-detector silence is the right call, unchanged here. But
// nothing else in the pipeline reports the deletion ITSELF: every constraint
// the file defined disappears in one PR, and the most severe possible change
// was producing the quietest possible output. This is additive, dispatched
// once from processPullRequestEvent.ts's diff-drift dispatch rather than
// folded into any single detector above, since the risk here belongs to the
// file's existence, not to any one server/permission/hook entry inside it.
function detectMonitoredFileDeleted(filePath, baseContent, headContent) {
    if (baseContent === null || headContent !== null) {
        return [];
    }
    return [
        {
            detectorId: 'diff-drift.monitored-file-deleted',
            severity: 'high',
            file: filePath,
            summary: `Monitored file '${filePath}' was deleted`,
            detail: `The head branch deletes ${filePath}, which previously defined MCP server, permission, and/or hook configuration. Deleting the file removes every constraint it defined in a single change, and every detector that compares against head content has nothing left to scan against -- this is flagged separately because the deletion itself, not any specific entry inside the file, is the risk.`,
        },
    ];
}

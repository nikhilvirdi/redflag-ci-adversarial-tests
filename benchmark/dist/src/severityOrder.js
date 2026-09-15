"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SEVERITY_ORDER = void 0;
exports.severityRank = severityRank;
exports.compareSeverity = compareSeverity;
exports.meetsOrExceeds = meetsOrExceeds;
// Severity ordering, from highest to lowest. The index in this array is the
// numeric rank: lower index = higher severity. Any future severity level added
// to Finding only needs to be inserted here in the right position.
exports.SEVERITY_ORDER = ['high', 'warning', 'info'];
// Returns the numeric rank of a severity level (0 is highest severity).
function severityRank(severity) {
    return exports.SEVERITY_ORDER.indexOf(severity);
}
// Sort comparator for ordering findings by severity (highest severity first).
function compareSeverity(a, b) {
    return severityRank(a) - severityRank(b);
}
// Returns true when `candidate` is at least as severe as `threshold` --
// i.e. its position in SEVERITY_ORDER is at or before threshold's position.
// A lower index means higher severity, so "meets or exceeds" is <=.
function meetsOrExceeds(candidate, threshold) {
    return severityRank(candidate) <= severityRank(threshold);
}

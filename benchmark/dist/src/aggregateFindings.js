"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.aggregateFindings = aggregateFindings;
const severityOrder_1 = require("./severityOrder");
// Input is one Finding[] per detector run. Array.prototype.sort is a stable
// sort (spec-guaranteed since ES2019), so findings that tie on severity keep
// the relative order they arrived in: detector order, then index within
// that detector's own list.
function aggregateFindings(findingsBySource) {
    return findingsBySource
        .flat()
        .sort((a, b) => (0, severityOrder_1.compareSeverity)(a.severity, b.severity));
}

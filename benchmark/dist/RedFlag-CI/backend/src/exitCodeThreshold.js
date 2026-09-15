"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.computeExitCode = computeExitCode;
const severityOrder_1 = require("./severityOrder");
// Pure function: given a findings list and an optional severity threshold,
// returns 1 if any finding meets or exceeds the threshold, 0 otherwise.
//
// BOUNDARY: this function exists exclusively as advisory output for a
// consumer's own CI step (e.g., a GitHub Actions job that reads RedFlag CI's
// JSON/SARIF export and decides whether to fail its own build). It must never
// be called from processPullRequestEvent.ts or postFindings.ts.
// RedFlag CI's own check run always stays success/neutral (architecture.md
// section 6 -- "RedFlag CI reports, it never fails the build"). Wiring this
// into the GitHub App would violate that design contract.
//
// If threshold is undefined (no threshold configured), always returns 0.
// This makes the mechanism fully opt-in by construction: a consumer that
// doesn't pass a threshold can never get an exit-code failure from this
// function, regardless of what findings are present.
function computeExitCode(findings, threshold) {
    if (threshold === undefined) {
        return 0;
    }
    const exceeded = findings.some((finding) => (0, severityOrder_1.meetsOrExceeds)(finding.severity, threshold));
    return exceeded ? 1 : 0;
}

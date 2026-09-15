"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectWidenedPermissions = detectWidenedPermissions;
const correlateRemovedAdded_1 = require("../correlateRemovedAdded");
const unicodeNormalize_1 = require("../unicodeNormalize");
// A wildcard escalates an added allow entry from warning to high only when
// we can be CONFIDENT it grants an unrestricted, open-ended class of actions:
// either the whole entry is nothing but wildcard characters ("*", "**"), or
// it has the shape Tool(...) and everything inside the parentheses is
// nothing but wildcard characters (e.g. "Bash(*)"). A wildcard embedded in a
// longer, scoped pattern -- "Read(*.log)", "Read(src/**)" -- is a narrow,
// bounded grant, not an unrestricted one. Staying at warning for those is
// deliberate: the detector cannot confirm how broad a mixed pattern actually
// is, and manufacturing false HIGH-severity confidence on a case it can't
// verify is worse than underconfidence -- severity calls must reflect the
// detector's real epistemic limits, not just "did a '*' appear anywhere."
//
// A bare tool name with no parentheses at all ("Bash") is unrestricted for
// the same reason: with nothing scoping it, it grants that whole tool,
// unconditionally -- just as open-ended as "Bash(*)", even though it
// contains no literal "*" character.
const UNRESTRICTED_WILDCARD_BODY = /^\*+$/;
const TOOL_CALL_SHAPE = /^[^()]+\(([^()]*)\)$/;
function isUnrestrictedWildcard(entry) {
    const trimmed = entry.trim();
    if (trimmed.length === 0) {
        return false;
    }
    const match = trimmed.match(TOOL_CALL_SHAPE);
    if (match) {
        const body = match[1].trim();
        return body.length > 0 && UNRESTRICTED_WILDCARD_BODY.test(body);
    }
    // No Tool(...) shape: a bare entry with no parentheses at all is either a
    // literal wildcard ("*", "**") or an unscoped tool name ("Bash") -- both
    // grant access with nothing to bound them, so both are unrestricted.
    return !trimmed.includes('(') && !trimmed.includes(')');
}
// The tool-name portion of an entry, for narrowing comparison: the text
// before "(" in a Tool(...) shape, or the whole trimmed entry for a bare
// token ("Bash", "*"). Two entries only correlate as a narrowing of each
// other if they scope the SAME tool -- correlating across different tools
// (e.g. "Bash(*)" narrowed by an unrelated "Write(*.log)" addition in the
// same diff) would be guessing at intent this detector has no way to confirm.
function toolName(entry) {
    const trimmed = entry.trim();
    if (!TOOL_CALL_SHAPE.test(trimmed)) {
        return trimmed;
    }
    return trimmed.slice(0, trimmed.indexOf('(')).trim();
}
// A removed allow entry and an added one correlate as a narrowing -- not a
// new grant -- only when: the removed entry was already an unrestricted
// wildcard for its tool (there's nothing to narrow FROM otherwise), the
// added entry is NOT itself an unrestricted wildcard (an actual narrowing
// has to narrow; wildcard-to-wildcard is no change in scope), and both
// scope the same tool. This can never misclassify a genuine widening as a
// narrowing: if the removed entry already grants everything for that tool,
// no possible added entry under the same tool can be broader than it -- the
// added entry is either equally unrestricted (excluded above) or strictly
// narrower (the only remaining case, which is exactly what this exists to
// catch). This reuses the same isUnrestrictedWildcard heuristic already
// established above rather than attempting full glob-subset semantics,
// which this detector -- like the rest of v1 -- deliberately does not try
// to do (architecture.md 2).
function isNarrowing(removed, added) {
    return (isUnrestrictedWildcard(removed) &&
        !isUnrestrictedWildcard(added) &&
        // Normalized (Task 5.8): a tool name expressed in a different Unicode
        // normalization form on either side of the diff must still be
        // recognized as the same tool for narrowing purposes.
        (0, unicodeNormalize_1.normalizeUnicode)(toolName(removed)) === (0, unicodeNormalize_1.normalizeUnicode)(toolName(added)));
}
function toStringArray(value) {
    if (!Array.isArray(value)) {
        return [];
    }
    return value.filter((v) => typeof v === 'string');
}
// Reads the permissions block out of .claude/settings.json. Returns null on
// malformed / non-object JSON (fail-open: the caller reports nothing), and an
// empty allow/deny pair when the permissions object is absent or the wrong shape.
function parsePermissions(content) {
    try {
        const parsed = JSON.parse(content);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
            return null;
        }
        const obj = parsed;
        const permissions = obj.permissions;
        if (!permissions || typeof permissions !== 'object' || Array.isArray(permissions)) {
            return { allow: [], deny: [] };
        }
        const permObj = permissions;
        return {
            allow: toStringArray(permObj.allow),
            deny: toStringArray(permObj.deny),
        };
    }
    catch {
        return null;
    }
}
function detectWidenedPermissions(filePath, baseContent, headContent) {
    // DD-3 compares an existing permission set against its successor. With either
    // side absent there is no before/after pair to widen, so nothing to report.
    if (baseContent === null || headContent === null) {
        return [];
    }
    const base = parsePermissions(baseContent);
    const head = parsePermissions(headContent);
    if (!base || !head) {
        return [];
    }
    const findings = [];
    const baseAllowSet = new Set(base.allow);
    const headAllowSet = new Set(head.allow);
    const headDeny = new Set(head.deny);
    // Membership checked on normalized entries (Task 5.8): an allow entry
    // expressed in a different Unicode normalization form between base and
    // head is the same entry to a reviewer, and must not read as a
    // removal+addition pair. removedAllow/addedAllow still carry each side's
    // original, un-normalized entry text for display and downstream checks.
    const normalizedBaseAllow = new Set([...baseAllowSet].map(unicodeNormalize_1.normalizeUnicode));
    const normalizedHeadAllow = new Set([...headAllowSet].map(unicodeNormalize_1.normalizeUnicode));
    const removedAllow = [...baseAllowSet].filter((entry) => !normalizedHeadAllow.has((0, unicodeNormalize_1.normalizeUnicode)(entry)));
    const addedAllow = [...headAllowSet].filter((entry) => !normalizedBaseAllow.has((0, unicodeNormalize_1.normalizeUnicode)(entry)));
    // Widening (1) & (3): allow entries genuinely new to head, after pulling
    // out any pair correlated as a narrowing (Task 3.3) -- e.g. "Bash(*)"
    // replaced by the narrower "Bash(npm test)" must not read as a brand-new
    // grant just because the exact string wasn't in base. DECISION (matching
    // Task 3.2's precedent, and this scenario's own documented ground truth
    // in redflag-ci-adversarial-tests/benchmark/corpus/manifest.ts): a correlated narrowing pair produces
    // NO finding at all, not a distinct "permission narrowed" finding --
    // architecture.md 5's DD-3 spec has no such finding type, and a
    // provably-narrower grant on the same tool isn't itself a risk DD-3
    // exists to catch. An allow entry that's simply removed with no
    // correlated addition is a pure narrowing and stays silent, unchanged
    // from before. A wildcard in a genuinely new (uncorrelated) entry still
    // escalates the finding to high; anything else is a warning.
    const { unmatchedAdded } = (0, correlateRemovedAdded_1.correlateRemovedAdded)(removedAllow, addedAllow, isNarrowing);
    for (const entry of unmatchedAdded) {
        if (isUnrestrictedWildcard(entry)) {
            // Same HIGH-severity classification either way (isUnrestrictedWildcard
            // above), but the wording must match what's actually in the entry: a
            // bare unscoped tool name ("Bash") carries no literal "*" at all, so
            // calling it a "wildcard permission" is factually wrong even though
            // it's just as unrestricted as one.
            if (entry.includes('*')) {
                findings.push({
                    detectorId: 'diff-drift.widened-permissions',
                    severity: 'high',
                    file: filePath,
                    summary: `Wildcard permission '${entry}' added to allow-list`,
                    detail: `The head branch adds the wildcard permission '${entry}' to the allow-list in ${filePath}. A wildcard grants a broad, open-ended class of actions rather than a single reviewed one, sharply widening the agent's unprompted execution surface.`,
                });
            }
            else {
                findings.push({
                    detectorId: 'diff-drift.widened-permissions',
                    severity: 'high',
                    file: filePath,
                    summary: `Unrestricted permission '${entry}' added to allow-list`,
                    detail: `The head branch adds '${entry}' to the allow-list in ${filePath} with nothing scoping it. An unscoped tool name grants that entire tool, unconditionally -- just as open-ended as an explicit wildcard even though it contains no literal '*' character -- sharply widening the agent's unprompted execution surface.`,
                });
            }
        }
        else {
            findings.push({
                detectorId: 'diff-drift.widened-permissions',
                severity: 'warning',
                file: filePath,
                summary: `Permission '${entry}' added to allow-list`,
                detail: `The head branch adds '${entry}' to the allow-list in ${filePath}. This widens what the agent is permitted to do without approval; a broader allow-list means more actions run unprompted.`,
            });
        }
    }
    // Widening (2): deny rules present in base but removed in head. Unchanged
    // by Task 3.3 -- no correlation involved, a different code path entirely.
    // Adding a deny rule is a narrowing change and is ignored. Membership
    // checked on normalized entries (Task 5.8), same reasoning as the allow
    // list above.
    const normalizedHeadDeny = new Set([...headDeny].map(unicodeNormalize_1.normalizeUnicode));
    for (const entry of new Set(base.deny)) {
        if (!normalizedHeadDeny.has((0, unicodeNormalize_1.normalizeUnicode)(entry))) {
            findings.push({
                detectorId: 'diff-drift.widened-permissions',
                severity: 'warning',
                file: filePath,
                summary: `Deny rule '${entry}' removed`,
                detail: `The head branch removes the deny rule '${entry}' from ${filePath}. Removing a deny rule lifts a restriction that previously blocked the agent from performing that action, widening what it is allowed to do.`,
            });
        }
    }
    return findings;
}

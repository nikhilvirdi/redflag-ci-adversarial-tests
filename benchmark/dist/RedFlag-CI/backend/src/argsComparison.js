"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitArgs = splitArgs;
exports.argsChanged = argsChanged;
const unicodeNormalize_1 = require("./unicodeNormalize");
// A "--"-prefixed token is a flagged/named argument (either self-contained
// "--key=value", or "--key" as a separate token from its value in the
// space-separated "--key value" shape); anything else -- including
// single-dash short flags like "-y" -- is positional. Positional tokens are
// compared strictly in order; flagged tokens are compared as an unordered
// multiset, since two independent named flags being reordered relative to
// each other or to unrelated positional arguments is cosmetic, not drift.
// Exported for a direct unit test of the constructed token string (Task
// 6.5): a stray NUL byte previously sat in this file's source, in the
// separator between ${token} and ${hasValue} below, undetected since Task
// 3.4. Two independent reasons it stayed invisible: (1) both sides of every
// comparison build this string the same way, so a corrupted separator
// silently changes nothing observable through any caller's public findings
// output; (2) TypeScript's own compiler silently sanitized the raw NUL into
// a space during compilation, so even the *runtime* string was never
// actually wrong -- only the .ts source byte was. See the source-byte-level
// test in argsComparison.test.ts, which is the only check that would
// actually have caught this.
function splitArgs(args) {
    const positional = [];
    const flagged = [];
    args.forEach((token, index) => {
        if (!token.startsWith('--')) {
            positional.push(token);
            return;
        }
        if (token.includes('=')) {
            // Self-contained: the token IS its complete identity, no ambiguity.
            flagged.push(token);
            return;
        }
        // Bare "--key": compare only WHETHER a value-looking token sits
        // immediately next to it, never WHICH one. Comparing the adjacent
        // token's actual identity would treat "--verbose" as if it took a value
        // just because some unrelated positional token happens to end up next
        // to it after an unrelated reorder (near-miss-args-reorder) -- a false
        // widening. Comparing only presence/absence of a value catches the case
        // that actually matters: a flag that had a value losing it entirely, or
        // vice versa (judgment-dd2-args-reorder-with-real-semantics, where
        // "--config" goes from "has a following value" to "followed by another
        // flag, no value at all" -- a genuine parsing break), without
        // manufacturing false confidence about content this detector has no way
        // to safely attribute to one flag over another.
        const next = args[index + 1];
        const hasValue = next !== undefined && !next.startsWith('--');
        flagged.push(`${token} ${hasValue}`);
    });
    return { positional, flagged };
}
// Whether an "args" field genuinely changed between base and head. Shared by
// DD-1 (newMcpServer.ts's rename correlation -- a rename should not be
// blocked by a harmless flag reorder that DD-2 would itself treat as no
// change) and DD-2 (swappedMcpServer.ts's own modification check): one
// canonical implementation instead of two independently-drifting ones. Prior
// to this extraction, the two genuinely disagreed -- DD-2 already ignored
// flag reordering here, but DD-1's rename correlation ran args through a
// strict, order-sensitive JSON.stringify comparison instead, so a rename
// with a simultaneous harmless flag reorder in the same diff spuriously
// reported as a brand-new server rather than correlating as a rename.
//
// Positional CLI arguments are still compared strictly in order -- a
// reorder there can change execution semantics -- while flagged/named
// arguments compare as an unordered multiset. Both sides are normalized
// (Task 5.8) before comparing, so a value that's byte-different only
// because of its Unicode normalization form doesn't read as a change.
function argsChanged(baseArgs, headArgs) {
    if (!Array.isArray(baseArgs) ||
        !Array.isArray(headArgs) ||
        !baseArgs.every((a) => typeof a === 'string') ||
        !headArgs.every((a) => typeof a === 'string')) {
        // Not a clean string array on one or both sides -- fall back to a plain
        // exact comparison rather than guessing at a shape this
        // flagged/positional split doesn't understand.
        return JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(baseArgs)) !== JSON.stringify((0, unicodeNormalize_1.normalizeDeep)(headArgs));
    }
    // Each element normalized once, up front (Task 5.8), so every comparison
    // below -- positional order, flagged multiset -- operates on already-equal
    // representations of any Unicode-normalization-only difference.
    const base = splitArgs(baseArgs.map(unicodeNormalize_1.normalizeUnicode));
    const head = splitArgs(headArgs.map(unicodeNormalize_1.normalizeUnicode));
    const positionalChanged = JSON.stringify(base.positional) !== JSON.stringify(head.positional);
    // Sorting before comparing turns "same multiset, different order" into
    // equal JSON strings; unequal counts of an identical entry (a flag
    // appearing twice on one side but once on the other) still compare as
    // different, same as a real Set-based comparison would require checking
    // separately -- sorted-array comparison gets both for free.
    const flaggedChanged = JSON.stringify([...base.flagged].sort()) !== JSON.stringify([...head.flagged].sort());
    return positionalChanged || flaggedChanged;
}

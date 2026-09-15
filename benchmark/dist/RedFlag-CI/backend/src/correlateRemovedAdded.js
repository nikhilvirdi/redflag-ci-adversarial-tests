"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.correlateRemovedAdded = correlateRemovedAdded;
// Generic remove/add correlation for one diff. Not tied to any detector or
// data shape: DD-1 will eventually pass MCP server entries (looking for a
// rename -- same command+args under a different key) and DD-3 will
// eventually pass permission strings (looking for a narrowing -- the added
// entry is a strict subset/prefix of the removed one). Neither rule lives
// here; the caller supplies `isCorrelated`, which decides whether a given
// (removed, added) pair should read as "this add is really a modification
// of that remove" rather than an unrelated remove and an unrelated add that
// merely happened in the same diff.
//
// Matching is greedy and one-to-one, in input order: each removed item is
// paired with the first not-yet-claimed added item the predicate accepts,
// and once paired, neither side is reused. This keeps the result
// deterministic (this project has no detector whose output depends on
// anything but its inputs) without needing a general bipartite-matching
// algorithm -- a removed/added diff pair is expected to correlate at most
// one way in practice (one server renamed to one new name, one permission
// narrowed to one new pattern), so "first eligible match wins" is a
// sufficient, explainable rule rather than an arbitrary simplification.
//
// Items on either side that never got claimed are returned as
// `unmatchedRemoved` / `unmatchedAdded`, since a genuinely new add (no
// correlated remove) or a genuine removal (no correlated add) is exactly
// what DD-1 and DD-3 still need to flag -- this utility only separates
// "correlated" pairs out of the diff, it doesn't decide what happens to
// either side of an uncorrelated one.
function correlateRemovedAdded(removed, added, isCorrelated) {
    const pairs = [];
    const claimedAddedIndices = new Set();
    const unmatchedRemoved = [];
    for (const removedItem of removed) {
        const addedIndex = added.findIndex((addedItem, index) => !claimedAddedIndices.has(index) && isCorrelated(removedItem, addedItem));
        if (addedIndex === -1) {
            unmatchedRemoved.push(removedItem);
        }
        else {
            claimedAddedIndices.add(addedIndex);
            pairs.push({ removed: removedItem, added: added[addedIndex] });
        }
    }
    const unmatchedAdded = added.filter((_, index) => !claimedAddedIndices.has(index));
    return { pairs, unmatchedRemoved, unmatchedAdded };
}

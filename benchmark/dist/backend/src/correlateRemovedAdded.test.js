"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const correlateRemovedAdded_1 = require("./correlateRemovedAdded");
describe('correlateRemovedAdded', () => {
    it('finds a correlated pair when the predicate matches', () => {
        const result = (0, correlateRemovedAdded_1.correlateRemovedAdded)(['a'], ['b'], () => true);
        expect(result.pairs).toEqual([{ removed: 'a', added: 'b' }]);
        expect(result.unmatchedRemoved).toEqual([]);
        expect(result.unmatchedAdded).toEqual([]);
    });
    it('produces no correlation when nothing matches the predicate', () => {
        const result = (0, correlateRemovedAdded_1.correlateRemovedAdded)(['a'], ['b'], () => false);
        expect(result.pairs).toEqual([]);
        expect(result.unmatchedRemoved).toEqual(['a']);
        expect(result.unmatchedAdded).toEqual(['b']);
    });
    it('finds the one true correlated pair among several removes and adds', () => {
        const removed = [
            { name: 'old-fs', command: 'npx', args: ['-y', 'server-filesystem'] },
            { name: 'old-git', command: 'npx', args: ['-y', 'server-git'] },
        ];
        const added = [
            { name: 'filesystem', command: 'npx', args: ['-y', 'server-filesystem'] },
            { name: 'brand-new', command: 'node', args: ['index.js'] },
        ];
        const sameCommandAndArgs = (r, a) => r.command === a.command && JSON.stringify(r.args) === JSON.stringify(a.args);
        const result = (0, correlateRemovedAdded_1.correlateRemovedAdded)(removed, added, sameCommandAndArgs);
        expect(result.pairs).toHaveLength(1);
        expect(result.pairs[0]).toEqual({ removed: removed[0], added: added[0] });
        expect(result.unmatchedRemoved).toEqual([removed[1]]);
        expect(result.unmatchedAdded).toEqual([added[1]]);
    });
    it('returns empty results for empty removed and added sets', () => {
        const result = (0, correlateRemovedAdded_1.correlateRemovedAdded)([], [], () => true);
        expect(result).toEqual({ pairs: [], unmatchedRemoved: [], unmatchedAdded: [] });
    });
    it('handles one side empty without matching anything, regardless of the predicate', () => {
        const onlyRemoved = (0, correlateRemovedAdded_1.correlateRemovedAdded)(['a', 'b'], [], () => true);
        expect(onlyRemoved.pairs).toEqual([]);
        expect(onlyRemoved.unmatchedRemoved).toEqual(['a', 'b']);
        expect(onlyRemoved.unmatchedAdded).toEqual([]);
        const onlyAdded = (0, correlateRemovedAdded_1.correlateRemovedAdded)([], ['x', 'y'], () => true);
        expect(onlyAdded.pairs).toEqual([]);
        expect(onlyAdded.unmatchedRemoved).toEqual([]);
        expect(onlyAdded.unmatchedAdded).toEqual(['x', 'y']);
    });
    it('claims each added item at most once, even when multiple removed items could match it', () => {
        // Both 'r1' and 'r2' satisfy the always-true predicate against the one
        // added item; the one-to-one, input-order matching rule documented on
        // the function must resolve this deterministically rather than
        // double-pairing 'a1'.
        const result = (0, correlateRemovedAdded_1.correlateRemovedAdded)(['r1', 'r2'], ['a1'], () => true);
        expect(result.pairs).toEqual([{ removed: 'r1', added: 'a1' }]);
        expect(result.unmatchedRemoved).toEqual(['r2']);
        expect(result.unmatchedAdded).toEqual([]);
    });
    it('does not mutate its input arrays (pure function)', () => {
        const removed = Object.freeze(['a', 'b']);
        const added = Object.freeze(['x', 'y']);
        expect(() => (0, correlateRemovedAdded_1.correlateRemovedAdded)(removed, added, (r, a) => r === 'a' && a === 'x')).not.toThrow();
        expect(removed).toEqual(['a', 'b']);
        expect(added).toEqual(['x', 'y']);
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const unicodeNormalize_1 = require("./unicodeNormalize");
// NFC (precomposed) vs NFD (decomposed) forms of the same rendered
// character ("e" with an acute accent), spelled out via explicit escapes
// rather than literal glyphs -- the two forms are visually indistinguishable
// in source, so writing them as literal characters would make it too easy
// to accidentally type the same form twice and have every "distinct byte
// sequence" assertion below pass vacuously.
const NFC_E_ACUTE = 'é'; // LATIN SMALL LETTER E WITH ACUTE, one code point
const NFD_E_ACUTE = 'é'; // LATIN SMALL LETTER E + COMBINING ACUTE ACCENT, two code points
describe('Task 5.8: normalizeUnicode', () => {
    it('composes an NFD (decomposed) accented character to its NFC (precomposed) form', () => {
        expect(NFC_E_ACUTE).not.toBe(NFD_E_ACUTE); // distinct byte sequences, same rendered glyph
        expect(NFC_E_ACUTE.length).toBe(1);
        expect(NFD_E_ACUTE.length).toBe(2);
        expect((0, unicodeNormalize_1.normalizeUnicode)(NFD_E_ACUTE)).toBe(NFC_E_ACUTE);
        expect((0, unicodeNormalize_1.normalizeUnicode)(NFC_E_ACUTE)).toBe(NFC_E_ACUTE);
    });
    it('leaves plain ASCII unchanged', () => {
        expect((0, unicodeNormalize_1.normalizeUnicode)('filesystem')).toBe('filesystem');
        expect((0, unicodeNormalize_1.normalizeUnicode)('Bash(npm test)')).toBe('Bash(npm test)');
    });
    it('leaves an empty string unchanged', () => {
        expect((0, unicodeNormalize_1.normalizeUnicode)('')).toBe('');
    });
    it('does not affect characters with no precomposed form, e.g. a zero-width space', () => {
        const withZwsp = `a${'​'}b`;
        expect((0, unicodeNormalize_1.normalizeUnicode)(withZwsp)).toBe(withZwsp);
    });
});
describe('Task 5.8: normalizeDeep', () => {
    it('normalizes a bare string', () => {
        expect((0, unicodeNormalize_1.normalizeDeep)(NFD_E_ACUTE)).toBe(NFC_E_ACUTE);
    });
    it('normalizes every string inside an array', () => {
        expect((0, unicodeNormalize_1.normalizeDeep)([NFD_E_ACUTE, 'plain'])).toEqual([NFC_E_ACUTE, 'plain']);
    });
    it('normalizes both keys and values inside a nested object', () => {
        const input = { [`caf${NFD_E_ACUTE}`]: { nested: NFD_E_ACUTE } };
        const result = (0, unicodeNormalize_1.normalizeDeep)(input);
        expect(result).toEqual({ [`caf${NFC_E_ACUTE}`]: { nested: NFC_E_ACUTE } });
    });
    it('leaves numbers, booleans, and null untouched', () => {
        expect((0, unicodeNormalize_1.normalizeDeep)(42)).toBe(42);
        expect((0, unicodeNormalize_1.normalizeDeep)(true)).toBe(true);
        expect((0, unicodeNormalize_1.normalizeDeep)(null)).toBe(null);
    });
    it('normalizes a mixed structure of arrays, objects, and scalars together', () => {
        const input = {
            command: 'npx',
            args: ['-y', `${NFD_E_ACUTE}-package`],
            env: { [`KEY${NFD_E_ACUTE}`]: 'value' },
            timeout: 5000,
            enabled: true,
        };
        const result = (0, unicodeNormalize_1.normalizeDeep)(input);
        expect(result).toEqual({
            command: 'npx',
            args: ['-y', `${NFC_E_ACUTE}-package`],
            env: { [`KEY${NFC_E_ACUTE}`]: 'value' },
            timeout: 5000,
            enabled: true,
        });
    });
    it('does not mutate the original input', () => {
        const input = { name: NFD_E_ACUTE };
        const result = (0, unicodeNormalize_1.normalizeDeep)(input);
        expect(input.name).toBe(NFD_E_ACUTE);
        expect(result.name).toBe(NFC_E_ACUTE);
    });
});

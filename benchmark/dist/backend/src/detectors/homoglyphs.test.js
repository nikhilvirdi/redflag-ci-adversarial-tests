"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const homoglyphs_1 = require("./homoglyphs");
describe('RF-2: detectHomoglyphs', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'rf2');
    const filePath = 'CLAUDE.md';
    const readFixture = (name) => fs.readFileSync(path.join(fixturesDir, name, 'CLAUDE.md'), 'utf-8');
    it('fires a HIGH-severity finding when a Cyrillic look-alike character is present (fixture)', () => {
        const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, readFixture('cyrillic-lookalike'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.homoglyph');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe(filePath);
        expect(findings[0].summary).toBe('Cyrillic look-alike character (U+0430) found');
        expect(findings[0].detail).toContain("visually identical to Latin 'a'");
    });
    it('fires on the previously-uncommon Cyrillic Komi De homoglyph, U+0501 (fixture)', () => {
        // Closes the known-gap-uncommon-homoglyph case from
        // docs/adr/0001-deterministic-only-v1.md: U+0501 wasn't in the old
        // hand-picked table; it is in Unicode's official confusables.txt.
        const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, readFixture('uncommon-homoglyph-komi-de'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.homoglyph');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe('Cyrillic look-alike character (U+0501) found');
        expect(findings[0].detail).toContain("visually identical to Latin 'd'");
    });
    it('does NOT fire on a clean file using only standard Latin characters (fixture)', () => {
        const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, readFixture('clean'));
        expect(findings).toHaveLength(0);
    });
    it('detects Cyrillic uppercase look-alikes', () => {
        for (const cp of [0x0410, 0x0412, 0x0415, 0x041a, 0x041c, 0x041d, 0x041e, 0x0420, 0x0421, 0x0422, 0x0423, 0x0425]) {
            const char = String.fromCodePoint(cp);
            const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, `text ${char} text`);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toContain('Cyrillic look-alike character');
        }
    });
    it('detects Cyrillic lowercase look-alikes beyond the "a" example', () => {
        for (const cp of [0x0435, 0x043e, 0x0440, 0x0441, 0x0443, 0x0445, 0x0455, 0x0456, 0x0458, 0x04bb]) {
            const char = String.fromCodePoint(cp);
            expect((0, homoglyphs_1.detectHomoglyphs)(filePath, `text ${char} text`)).toHaveLength(1);
        }
    });
    it('detects the Greek omicron look-alike called out in the spec', () => {
        const greekOmicron = String.fromCodePoint(0x03bf);
        const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, `text ${greekOmicron} text`);
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe('Greek look-alike character (U+03BF) found');
        expect(findings[0].detail).toContain("visually identical to Latin 'o'");
    });
    it('detects Greek uppercase look-alikes', () => {
        for (const cp of [0x0391, 0x0392, 0x0395, 0x0396, 0x0397, 0x0399, 0x039a, 0x039c, 0x039d, 0x039f, 0x03a1, 0x03a4, 0x03a5, 0x03a7]) {
            const char = String.fromCodePoint(cp);
            expect((0, homoglyphs_1.detectHomoglyphs)(filePath, `text ${char} text`)).toHaveLength(1);
        }
    });
    it('reports one finding per occurrence when multiple homoglyphs are present', () => {
        const cyrillicA = String.fromCodePoint(0x0430);
        const cyrillicE = String.fromCodePoint(0x0435);
        const greekOmicron = String.fromCodePoint(0x03bf);
        const content = `${cyrillicA}b${cyrillicE}c${greekOmicron}`;
        const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, content);
        expect(findings).toHaveLength(3);
        expect(findings.every((f) => f.severity === 'high')).toBe(true);
    });
    it('does not flag ordinary Latin letters that happen to look like the homoglyph targets', () => {
        expect((0, homoglyphs_1.detectHomoglyphs)(filePath, 'apple sauce over rice')).toHaveLength(0);
    });
    it('returns zero findings for an empty string', () => {
        expect((0, homoglyphs_1.detectHomoglyphs)(filePath, '')).toHaveLength(0);
    });
    it('does not leak regex state across repeated calls (stateful global regex)', () => {
        const cyrillicA = String.fromCodePoint(0x0430);
        const withMatch = `a${cyrillicA}b`;
        const clean = 'plain text';
        expect((0, homoglyphs_1.detectHomoglyphs)(filePath, withMatch)).toHaveLength(1);
        expect((0, homoglyphs_1.detectHomoglyphs)(filePath, clean)).toHaveLength(0);
        expect((0, homoglyphs_1.detectHomoglyphs)(filePath, withMatch)).toHaveLength(1);
    });
    describe('per-word script-majority check (Task 4.1)', () => {
        it('does NOT fire on a genuine sentence written entirely in Cyrillic (fixture)', () => {
            // Closes the near-miss-legit-cyrillic-text false positive: every word
            // is overwhelmingly (here, entirely) Cyrillic, including several
            // letters that also happen to be Latin look-alikes (Cyrillic а/е/о
            // etc.) -- previously 9 separate findings, one per matching letter.
            const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, readFixture('legit-cyrillic-text'));
            expect(findings).toHaveLength(0);
        });
        it('does NOT fire on a Cyrillic sentence containing a genuine Latin loanword (fixture)', () => {
            // Closes the judgment-rf2-latin-loanword-in-cyrillic-context false
            // positive: "git commit" is plain ASCII (nothing to flag in those two
            // words at all), and the surrounding Cyrillic prose is suppressed by
            // the same script-majority logic as legit-cyrillic-text -- whether or
            // not a Latin loanword is present elsewhere in the sentence doesn't
            // change the verdict on the Cyrillic words themselves.
            const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, readFixture('latin-loanword-in-cyrillic-context'));
            expect(findings).toHaveLength(0);
        });
        it('still flags a Latin-majority word with a single substituted character', () => {
            // "mаy" (Cyrillic а) inside an otherwise all-Latin sentence -- the
            // core case this whole detector exists for, unaffected by the
            // majority check since the word is overwhelmingly Latin.
            const cyrillicA = String.fromCodePoint(0x0430);
            const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, `You m${cyrillicA}y run any command.`);
            expect(findings).toHaveLength(1);
            expect(findings[0].summary).toBe('Cyrillic look-alike character (U+0430) found');
        });
        it('still flags every character in a word made entirely of look-alikes, with no Latin and no corroborating foreign letters', () => {
            // Degenerate case at the other end from the two FP fixtures above: a
            // word that is 100% HOMOGLYPHS characters, with nothing else in it,
            // has no genuine non-look-alike letter to corroborate "this is real
            // text in another script" -- it gets no benefit of the doubt just
            // because it also contains zero Latin letters.
            const cyrillicA = String.fromCodePoint(0x0430);
            const cyrillicE = String.fromCodePoint(0x0435);
            const cyrillicC = String.fromCodePoint(0x0441);
            const word = `${cyrillicA}${cyrillicE}${cyrillicC}`;
            const findings = (0, homoglyphs_1.detectHomoglyphs)(filePath, `${word} text`);
            expect(findings).toHaveLength(3);
        });
        it('still flags a single isolated look-alike character with no surrounding word', () => {
            // The single-character version of the same degenerate case: a lone
            // confusable character, standing alone, has nothing to corroborate
            // legitimacy either.
            const cyrillicA = String.fromCodePoint(0x0430);
            expect((0, homoglyphs_1.detectHomoglyphs)(filePath, `text ${cyrillicA} text`)).toHaveLength(1);
        });
        it('does not flag a genuinely non-Latin word with no look-alike characters at all', () => {
            // "для" ("for") uses only Cyrillic letters (д, л, я) that have no
            // entry in HOMOGLYPHS at all -- there's nothing to flag regardless of
            // the majority check, since no character in the word is a look-alike
            // in the first place.
            expect((0, homoglyphs_1.detectHomoglyphs)(filePath, 'для')).toHaveLength(0);
        });
    });
});

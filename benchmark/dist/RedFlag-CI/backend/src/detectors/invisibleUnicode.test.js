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
const invisibleUnicode_1 = require("./invisibleUnicode");
describe('RF-1: detectInvisibleUnicode', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'rf1');
    const filePath = 'CLAUDE.md';
    const readFixture = (name) => fs.readFileSync(path.join(fixturesDir, name, 'CLAUDE.md'), 'utf-8');
    it('fires a HIGH-severity finding when a zero-width space is present (fixture)', () => {
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, readFixture('zero-width-space'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe(filePath);
        expect(findings[0].summary).toBe('Invisible Unicode character (U+200B) found');
        expect(findings[0].detail).toContain('zero-width space');
    });
    it('fires a HIGH-severity finding when a bidirectional override character is present (fixture)', () => {
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, readFixture('bidi-override'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe(filePath);
        expect(findings[0].summary).toBe('Invisible Unicode character (U+202E) found');
        expect(findings[0].detail).toContain('right-to-left override');
    });
    it('fires a HIGH-severity finding when a combining grapheme joiner is present (fixture)', () => {
        // Closes the encoding-combining-diacritical-invisible gap: U+034F has no
        // visible rendering even paired with a base character, unlike an
        // ordinary diacritic elsewhere in the Combining Diacritical Marks block.
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, readFixture('combining-diacritical-mark'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe(filePath);
        expect(findings[0].summary).toBe('Invisible Unicode character (U+034F) found');
    });
    it('detects the full Combining Diacritical Marks block boundaries (U+0300 and U+036F)', () => {
        for (const cp of [0x0300, 0x036f]) {
            const char = String.fromCodePoint(cp);
            expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, `text ${char} text`)).toHaveLength(1);
        }
    });
    it('fires a HIGH-severity finding when a Unicode Tags LANGUAGE TAG character is present (fixture)', () => {
        // Closes the encoding-unicode-tag-characters gap: U+E0001 is astral-plane
        // (a surrogate pair in UTF-16), which is why the regex needed the "u"
        // flag as well as the new range -- without it, this fixture would fail
        // to match rather than false-match, per the note in the code comment.
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, readFixture('unicode-tag-language-tag'));
        expect(findings).toHaveLength(1);
        expect(findings[0].detectorId).toBe('rule-file.invisible-unicode');
        expect(findings[0].severity).toBe('high');
        expect(findings[0].file).toBe(filePath);
        expect(findings[0].summary).toBe('Invisible Unicode character (U+E0001) found');
    });
    it('detects the full Unicode Tags block boundaries (U+E0000 and U+E007F)', () => {
        for (const cp of [0xe0000, 0xe007f]) {
            const char = String.fromCodePoint(cp);
            expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, `text ${char} text`)).toHaveLength(1);
        }
    });
    it('does not false-match on unrelated astral-plane characters outside the Tags block', () => {
        // Regression guard for the "u" flag's known risk: it must not turn any
        // arbitrary surrogate pair into a match, only the specific new range.
        const emoji = String.fromCodePoint(0x1f600); // outside U+E0000-U+E007F
        const mathBold = String.fromCodePoint(0x1d400); // astral, handled by RF-2 not RF-1
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, `text ${emoji} text`)).toHaveLength(0);
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, `text ${mathBold} text`)).toHaveLength(0);
    });
    it('does NOT fire on a clean file with no invisible characters (fixture)', () => {
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, readFixture('clean'));
        expect(findings).toHaveLength(0);
    });
    it('detects a zero-width joiner and zero-width non-joiner', () => {
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, 'a‍b')).toHaveLength(1);
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, 'a‌b')).toHaveLength(1);
    });
    it('detects the full bidi embedding/override/isolate range', () => {
        for (const cp of [0x202a, 0x202b, 0x202c, 0x202d, 0x202e, 0x2066, 0x2067, 0x2068, 0x2069]) {
            const char = String.fromCodePoint(cp);
            expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, `text ${char} text`)).toHaveLength(1);
        }
    });
    it('reports one finding per occurrence when multiple invisible characters are present', () => {
        const content = 'a​b​c‮d';
        const findings = (0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, content);
        expect(findings).toHaveLength(3);
        expect(findings.every((f) => f.severity === 'high')).toBe(true);
    });
    it('returns zero findings for an empty string', () => {
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, '')).toHaveLength(0);
    });
    it('does not leak regex state across repeated calls (stateful global regex)', () => {
        const withMatch = 'a​b';
        const clean = 'plain text';
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, withMatch)).toHaveLength(1);
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, clean)).toHaveLength(0);
        expect((0, invisibleUnicode_1.detectInvisibleUnicode)(filePath, withMatch)).toHaveLength(1);
    });
});

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.detectInvisibleUnicode = detectInvisibleUnicode;
const CHARACTER_NAMES = {
    0x00ad: 'soft hyphen',
    0x200b: 'zero-width space',
    0x200c: 'zero-width non-joiner',
    0x200d: 'zero-width joiner',
    0x200f: 'right-to-left mark',
    0x202a: 'left-to-right embedding',
    0x202b: 'right-to-left embedding',
    0x202c: 'pop directional formatting',
    0x202d: 'left-to-right override',
    0x202e: 'right-to-left override',
    0x2066: 'left-to-right isolate',
    0x2067: 'right-to-left isolate',
    0x2068: 'first strong isolate',
    0x2069: 'pop directional isolate',
};
// Combining Diacritical Marks (U+0300-U+036F): zero-width combining marks
// that render invisibly when not paired with a base character they modify,
// or stacked past what any legitimate diacritic use needs -- the same
// "invisible to a human reviewer, still read by an AI agent" risk as the
// zero-width and bidi-control ranges above. U+034F (combining grapheme
// joiner) is the specific gap this closes: it's defined to have no visible
// rendering at all, even paired with a base character.
// The combining marks in \u0300-\u036F are exactly what this detector
// targets, not an accidental base+combining-mark grapheme cluster the rule
// below warns about, hence the disable.
//
// Unicode Tags (U+E0000-U+E007F): an astral-plane block (outside the Basic
// Multilingual Plane, above U+FFFF) originally meant for language tagging,
// with no legitimate use in rule-file prose today -- documented as having
// been used for steganographic prompt injection, hiding instructions inside
// characters that render as nothing at all. \u{E0000}-\u{E007F} code-point
// escapes require the "u" flag to parse (invalid syntax without it) and, on
// a match, to be treated as one code point rather than two independent
// surrogate-half matches -- without "u", each surrogate half is matched
// against the class separately, and neither half's UTF-16 code unit
// (0xDB40 / 0xDC00-0xDC7F for this block) falls inside any BMP range already
// in this class, so the tag character would simply fail to match rather
// than false-matching. Adding "u" doesn't change matching for the existing
// BMP-only ranges (\u00AD, \u200B-\u200D, etc.): under the "u" flag those
// 4-hex-digit escapes still mean exactly the same single BMP code points
// they did before, and none of them fall in the surrogate range
// (U+D800-U+DFFF), so there's no ambiguity between "a BMP range entry" and
// "half of an astral pair" for the engine to resolve differently.
// eslint-disable-next-line no-misleading-character-class
const INVISIBLE_CHAR_PATTERN = /[\u00AD\u200B-\u200D\u200F\u202A-\u202E\u2066-\u2069\u0300-\u036F\u{E0000}-\u{E007F}]/gu;
function locate(content, index) {
    const before = content.slice(0, index);
    const lastNewline = before.lastIndexOf('\n');
    return { line: before.split('\n').length, column: index - lastNewline };
}
function detectInvisibleUnicode(filePath, content) {
    const findings = [];
    let match;
    while ((match = INVISIBLE_CHAR_PATTERN.exec(content)) !== null) {
        const codePoint = match[0].codePointAt(0);
        const hex = codePoint.toString(16).toUpperCase().padStart(4, '0');
        const name = CHARACTER_NAMES[codePoint] ?? 'invisible/bidi-control character';
        const { line, column } = locate(content, match.index);
        findings.push({
            detectorId: 'rule-file.invisible-unicode',
            severity: 'high',
            file: filePath,
            summary: `Invisible Unicode character (U+${hex}) found`,
            detail: `A ${name} (U+${hex}) was found in ${filePath} at line ${line}, column ${column}. Invisible and bidirectional-control characters have no legitimate use in an instruction file and can be used to hide malicious instructions from human reviewers while an AI agent still reads and follows them.`,
        });
    }
    return findings;
}

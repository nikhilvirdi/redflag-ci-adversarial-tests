"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeUnicode = normalizeUnicode;
exports.normalizeDeep = normalizeDeep;
// Wraps String.prototype.normalize('NFC'), the single normalization form
// every detector's comparison/set-membership check should use (Task 5.8):
// Unicode allows the same visible character to be encoded multiple ways --
// "e" (U+00E9) as one precomposed code point, or as "e" + a combining acute
// accent (U+0065 U+0301) -- and those two byte sequences are NOT equal under
// plain JS string ===/Set/Map comparison, even though they render
// identically to a human reviewer. Without normalizing first, an attacker
// (or just an editor/OS that happens to normalize differently) can dodge a
// "this is the same entry as before" match, or manufacture a spurious
// "this is a brand-new entry" finding, purely by picking a different
// encoding of an unchanged name.
//
// NFC (canonical composition) is the form used throughout, not NFD: it's
// what most editors, browsers, and typed input produce by default, so
// treating it as canonical keeps the overwhelming majority of real-world
// strings unchanged (NFC of an already-NFC or plain-ASCII string is that
// same string, byte for byte) while only altering the rarer decomposed form
// to match it.
function normalizeUnicode(value) {
    return value.normalize('NFC');
}
// Recursively normalizes every string reachable from `value` -- both object
// keys and every string value, at any depth through nested objects and
// arrays -- leaving non-string types (numbers, booleans, null) untouched.
// Exists for comparison points that compare a whole structured value at once
// (e.g. DD-2 diffing a server's "args" array or "env" object via
// JSON.stringify) rather than one already-extracted string at a time, where
// normalizeUnicode alone isn't enough: JSON.stringify serializes raw UTF-16
// code units, so an unnormalized string nested anywhere inside the
// structure would still make two otherwise-identical values compare unequal.
function normalizeDeep(value) {
    if (typeof value === 'string') {
        return normalizeUnicode(value);
    }
    if (Array.isArray(value)) {
        return value.map((item) => normalizeDeep(item));
    }
    if (value !== null && typeof value === 'object') {
        const result = {};
        for (const [key, val] of Object.entries(value)) {
            result[normalizeUnicode(key)] = normalizeDeep(val);
        }
        return result;
    }
    return value;
}

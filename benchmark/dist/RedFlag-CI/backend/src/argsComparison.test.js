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
const argsComparison_1 = require("./argsComparison");
describe('argsChanged', () => {
    it('does NOT report a change when only flagged/named arguments are reordered', () => {
        // Mirrors dd2's near-miss-args-reorder fixture: "-y" and the package
        // name are positional and stay in the same relative order; only the
        // bare "--verbose" flag moves.
        const before = ['-y', '--verbose', '@modelcontextprotocol/server-filesystem'];
        const after = ['--verbose', '-y', '@modelcontextprotocol/server-filesystem'];
        expect((0, argsComparison_1.argsChanged)(before, after)).toBe(false);
    });
    it('reports a change when a positional argument is reordered', () => {
        const before = ['src', 'dest', '--verbose'];
        const after = ['dest', 'src', '--verbose'];
        expect((0, argsComparison_1.argsChanged)(before, after)).toBe(true);
    });
    it('reports a change when a flag that had a value loses it entirely', () => {
        // Mirrors dd2's args-reorder-real-semantics fixture: "--config" goes
        // from "has a following value" to "followed by another flag, no value
        // at all" -- a genuine parsing break, not cosmetic reordering, even
        // though the positional argument's own position is unchanged.
        const before = ['--config', '/etc/app.conf', '--verbose'];
        const after = ['/etc/app.conf', '--config', '--verbose'];
        expect((0, argsComparison_1.argsChanged)(before, after)).toBe(true);
    });
    it('does NOT report a change when both sides are identical', () => {
        const args = ['-y', 'pkg', '--verbose'];
        expect((0, argsComparison_1.argsChanged)(args, [...args])).toBe(false);
    });
    it('falls back to an exact comparison when either side is not a clean string array', () => {
        expect((0, argsComparison_1.argsChanged)(['a', 1], ['a', 1])).toBe(false);
        expect((0, argsComparison_1.argsChanged)(['a', 1], ['a', 2])).toBe(true);
        expect((0, argsComparison_1.argsChanged)(null, ['a'])).toBe(true);
        expect((0, argsComparison_1.argsChanged)(undefined, undefined)).toBe(false);
    });
});
describe('Task 6.5: splitArgs token construction has no embedded control characters', () => {
    // Guards against a regression of a real bug: the space in
    // `${token} ${hasValue}` had been a stray NUL byte on disk since Task 3.4,
    // undetected until Task 6.5. Two independent reasons no test ever caught
    // it: both sides of every comparison built the identical string either
    // way (so no finding ever changed), AND TypeScript's compiler silently
    // sanitized the NUL into a space during compilation, so even the
    // *runtime* string was never actually wrong. The runtime-string
    // assertions below are still worth keeping (general correctness
    // coverage), but the source-byte test after them is the only one of the
    // two that would actually have caught this bug.
    // Char-code check rather than a /[\x00-\x1F\x7F]/ regex literal, which
    // ESLint's no-control-regex rule (correctly) flags as suspicious.
    function hasControlChar(s) {
        return [...s].some((ch) => {
            const code = ch.charCodeAt(0);
            return code < 32 || code === 127;
        });
    }
    it('joins a bare flag and its value-presence marker with a plain space, no control characters', () => {
        const { flagged } = (0, argsComparison_1.splitArgs)(['--config', '/etc/app.conf']);
        expect(flagged).toEqual(['--config true']);
        expect(hasControlChar(flagged[0])).toBe(false);
    });
    it('does the same for a bare flag with no following value', () => {
        const { flagged } = (0, argsComparison_1.splitArgs)(['--verbose']);
        expect(flagged).toEqual(['--verbose false']);
        expect(hasControlChar(flagged[0])).toBe(false);
    });
    it('never embeds a control character in any flagged token, across every splitArgs code path', () => {
        const { flagged } = (0, argsComparison_1.splitArgs)(['--timeout=30', '--config', '/etc/app.conf', '--verbose', 'pkg']);
        expect(flagged.length).toBeGreaterThan(0);
        for (const token of flagged) {
            expect(hasControlChar(token)).toBe(false);
        }
    });
    it('has no embedded NUL byte anywhere in the .ts source file itself', () => {
        // The actual guard: TypeScript quietly repairs a NUL inside a template
        // literal at compile time, so a runtime-string check alone (above) can
        // never detect this class of regression. Only reading the source
        // file's raw bytes can.
        const sourcePath = path.join(__dirname, 'argsComparison.ts');
        const raw = fs.readFileSync(sourcePath);
        expect(raw.includes(0)).toBe(false);
    });
});

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
const widenedPermissions_1 = require("./widenedPermissions");
describe('DD-3: detectWidenedPermissions', () => {
    const fixturesDir = path.join(__dirname, '__fixtures__', 'dd3');
    const filePath = '.claude/settings.json';
    const readFixture = (name, file) => fs.readFileSync(path.join(fixturesDir, name, file), 'utf-8');
    it('fires a warning when an entry is added to the allow-list (fixture)', () => {
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('allow-added', 'before.json'), readFixture('allow-added', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.widened-permissions',
            severity: 'warning',
            file: filePath,
            summary: "Permission 'Read(.env)' added to allow-list",
            detail: "The head branch adds 'Read(.env)' to the allow-list in .claude/settings.json. " +
                'This widens what the agent is permitted to do without approval; a broader ' +
                'allow-list means more actions run unprompted.',
        });
    });
    it('fires a warning when a deny rule present in base is removed in head (fixture)', () => {
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('deny-removed', 'before.json'), readFixture('deny-removed', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.widened-permissions',
            severity: 'warning',
            file: filePath,
            summary: "Deny rule 'Bash(rm)' removed",
            detail: "The head branch removes the deny rule 'Bash(rm)' from .claude/settings.json. " +
                'Removing a deny rule lifts a restriction that previously blocked the agent from ' +
                'performing that action, widening what it is allowed to do.',
        });
    });
    it('fires a HIGH-severity finding when a wildcard is introduced into the allow-list (fixture)', () => {
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('wildcard-introduced', 'before.json'), readFixture('wildcard-introduced', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.widened-permissions',
            severity: 'high',
            file: filePath,
            summary: "Wildcard permission 'Bash(*)' added to allow-list",
            detail: "The head branch adds the wildcard permission 'Bash(*)' to the allow-list in " +
                ".claude/settings.json. A wildcard grants a broad, open-ended class of actions " +
                "rather than a single reviewed one, sharply widening the agent's unprompted " +
                'execution surface.',
        });
    });
    it('keeps a scoped glob pattern at warning, not high, even though it contains "*" (fixture)', () => {
        // Regression coverage for the wildcard-escalation bug found via benchmark
        // stress-testing (dd3-narrowing-syntax-rewrite): a wildcard embedded in a
        // longer, scoped pattern like "Read(src/**)" is a narrow, bounded grant,
        // not the same thing as "Bash(*)" being wide open. Escalating both to the
        // same HIGH severity would manufacture false confidence the detector
        // cannot back up.
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('scoped-glob-wildcard', 'before.json'), readFixture('scoped-glob-wildcard', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.widened-permissions',
            severity: 'warning',
            file: filePath,
            summary: "Permission 'Read(src/**)' added to allow-list",
            detail: "The head branch adds 'Read(src/**)' to the allow-list in .claude/settings.json. " +
                'This widens what the agent is permitted to do without approval; a broader ' +
                'allow-list means more actions run unprompted.',
        });
    });
    it('does NOT fire on a narrowing change: allow entry removed and deny rule added (fixture)', () => {
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('narrowing', 'before.json'), readFixture('narrowing', 'after.json'));
        expect(findings).toHaveLength(0);
    });
    it('does NOT fire when an allow entry is only removed (pure narrowing)', () => {
        const before = JSON.stringify({ permissions: { allow: ['Read(a)', 'Read(b)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after)).toHaveLength(0);
    });
    it('does NOT fire when a deny rule is only added (pure narrowing)', () => {
        const before = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: ['Bash(rm)'] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after)).toHaveLength(0);
    });
    it('does NOT fire when nothing changed', () => {
        const same = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: ['Bash(rm)'] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, same, same)).toHaveLength(0);
    });
    it('reports each added allow entry and each removed deny rule as separate findings', () => {
        const before = JSON.stringify({
            permissions: { allow: ['Read(a)'], deny: ['Bash(rm)', 'Bash(curl:*)'] },
        });
        const after = JSON.stringify({
            permissions: { allow: ['Read(a)', 'Read(b)', 'Write(c)'], deny: ['Bash(rm)'] },
        });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        // 2 added allow entries (Read(b), Write(c)) + 1 removed deny (Bash(curl:*)).
        expect(findings).toHaveLength(3);
        const summaries = findings.map((f) => f.summary);
        expect(summaries).toContain("Permission 'Read(b)' added to allow-list");
        expect(summaries).toContain("Permission 'Write(c)' added to allow-list");
        expect(summaries).toContain("Deny rule 'Bash(curl:*)' removed");
        // None of these carry a wildcard-introduction, so all stay at warning.
        expect(findings.every((f) => f.severity === 'warning')).toBe(true);
    });
    it('keeps deny-removal at warning even when the removed deny rule contained a wildcard', () => {
        // The escalation clause is scoped to wildcard INTRODUCTION in the allow-list;
        // removing a deny rule is the separate condition and stays a warning.
        const before = JSON.stringify({ permissions: { allow: [], deny: ['Bash(*)'] } });
        const after = JSON.stringify({ permissions: { allow: [], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('warning');
        expect(findings[0].summary).toBe("Deny rule 'Bash(*)' removed");
    });
    it('treats a top-level bare wildcard entry as a wildcard introduction (high)', () => {
        const before = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Read(a)', '*'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe("Wildcard permission '*' added to allow-list");
    });
    it('escalates a bare recursive-glob entry ("**") the same as a single "*"', () => {
        // Generalization of the "entire body is wildcard characters" rule: a bare
        // "**" is just as unrestricted as "*", since nothing scopes it.
        const before = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Read(a)', '**'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
    });
    // Regression: a bare unscoped tool name with no "*" character at all is
    // correctly classified as unrestricted (isUnrestrictedWildcard), but the
    // finding text previously called it a "Wildcard permission" unconditionally
    // -- factually wrong for an entry that contains no wildcard character.
    // Every prior "Wildcard permission" fixture/test happens to contain a
    // literal "*", so this gap was untested.
    it('describes a bare unscoped tool name (no literal "*") as unrestricted, not a wildcard', () => {
        const before = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Read(a)', 'WebFetch'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe("Unrestricted permission 'WebFetch' added to allow-list");
        expect(findings[0].summary).not.toMatch(/wildcard/i);
        expect(findings[0].detail).toContain('nothing scoping it');
    });
    it('does not escalate wildcards scoped by an extension or a directory prefix', () => {
        const before = JSON.stringify({ permissions: { allow: [], deny: [] } });
        const after = JSON.stringify({
            permissions: { allow: ['Read(*.log)', 'Bash(npm run *)'], deny: [] },
        });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(2);
        expect(findings.every((f) => f.severity === 'warning')).toBe(true);
    });
    it('ignores non-string entries in the permission arrays', () => {
        const before = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        const after = JSON.stringify({
            permissions: { allow: ['Read(a)', 42, null, { x: 1 }], deny: [] },
        });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after)).toHaveLength(0);
    });
    it('treats an absent permissions block as empty (no findings)', () => {
        const before = JSON.stringify({ hooks: {} });
        const after = JSON.stringify({ hooks: {}, other: true });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after)).toHaveLength(0);
    });
    it('returns zero findings when base is null (newly added file)', () => {
        const after = JSON.stringify({ permissions: { allow: ['Bash(*)'], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, null, after)).toHaveLength(0);
    });
    it('returns zero findings when head is null (file deleted)', () => {
        const before = JSON.stringify({ permissions: { allow: ['Bash(*)'], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, null)).toHaveLength(0);
    });
    it('fails open (zero findings) when base content is malformed JSON', () => {
        const after = JSON.stringify({ permissions: { allow: ['Bash(*)'], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, '{ malformed', after)).toHaveLength(0);
    });
    it('fails open (zero findings) when head content is malformed JSON', () => {
        const before = JSON.stringify({ permissions: { allow: [], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, '{ malformed')).toHaveLength(0);
    });
    it('fails open (zero findings) when content is a valid JSON primitive or array', () => {
        const valid = JSON.stringify({ permissions: { allow: ['Read(a)'], deny: [] } });
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, valid, '[1, 2, 3]')).toHaveLength(0);
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, '"hello"', valid)).toHaveLength(0);
        expect((0, widenedPermissions_1.detectWidenedPermissions)(filePath, valid, '123')).toHaveLength(0);
    });
    it('produces zero findings when a wildcard is narrowed to a specific command (fixture)', () => {
        // Closes the dd3-wildcard-narrowed-to-specific false positive:
        // "Bash(*)" -> "Bash(npm test)" correlates as a narrowing via
        // correlateRemovedAdded, per this task's documented decision to report
        // nothing rather than a distinct "narrowed" finding.
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('wildcard-narrowed-to-specific', 'before.json'), readFixture('wildcard-narrowed-to-specific', 'after.json'));
        expect(findings).toHaveLength(0);
    });
    it('produces zero findings when a wildcard is narrowed to a scoped glob (fixture)', () => {
        // Closes the dd3-narrowing-syntax-rewrite false positive: "Write(*)" ->
        // "Write(./dist/**)" correlates as a narrowing even though the
        // replacement string still contains a literal "*" -- the replacement
        // itself is not an unrestricted wildcard, which is what matters.
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('narrowing-syntax-rewrite', 'before.json'), readFixture('narrowing-syntax-rewrite', 'after.json'));
        expect(findings).toHaveLength(0);
    });
    it('reports the genuine widening but stays silent on the correlated narrowing, in the same diff (fixture)', () => {
        // The critical case: "Bash(*)" -> "Bash(npm test)" is a narrowing
        // (silent), while "Write(*)" is a brand-new, unrelated wildcard grant
        // with nothing removed to correlate against (must still fire, high
        // severity). The narrowing correlation must never swallow a genuine,
        // simultaneous widening just because both changes touch the same file.
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('wildcard-added-then-narrowed-same-pr', 'before.json'), readFixture('wildcard-added-then-narrowed-same-pr', 'after.json'));
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe("Wildcard permission 'Write(*)' added to allow-list");
    });
    it('does not correlate a narrowing across two different tools', () => {
        // "Bash(*)" removed and "Write(npm test)" added share nothing but both
        // being present in the same diff -- different tool names must never
        // correlate, regardless of how narrow the added entry looks.
        const before = JSON.stringify({ permissions: { allow: ['Bash(*)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Write(npm test)'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('warning');
        expect(findings[0].summary).toBe("Permission 'Write(npm test)' added to allow-list");
    });
    it('does not correlate wildcard-to-wildcard as a narrowing (no actual narrowing occurred)', () => {
        const before = JSON.stringify({ permissions: { allow: ['Bash(*)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Bash(**)'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('high');
        expect(findings[0].summary).toBe("Wildcard permission 'Bash(**)' added to allow-list");
    });
    it('does not correlate narrowing FROM an already-scoped entry (nothing to narrow from)', () => {
        // "Bash(npm test)" was never unrestricted, so its replacement by
        // "Bash(npm run build)" is a genuine change of grant, not a narrowing --
        // the detector cannot confirm one is a subset of the other.
        const before = JSON.stringify({ permissions: { allow: ['Bash(npm test)'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Bash(npm run build)'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(1);
        expect(findings[0].severity).toBe('warning');
        expect(findings[0].summary).toBe("Permission 'Bash(npm run build)' added to allow-list");
    });
    it('correlates a bare unscoped tool name narrowed to a scoped call under the same tool', () => {
        const before = JSON.stringify({ permissions: { allow: ['Bash'], deny: [] } });
        const after = JSON.stringify({ permissions: { allow: ['Bash(npm test)'], deny: [] } });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        expect(findings).toHaveLength(0);
    });
    it('leaves deny-rule-removal findings completely unaffected by allow-list narrowing correlation', () => {
        const before = JSON.stringify({
            permissions: { allow: ['Bash(*)'], deny: ['Bash(rm)'] },
        });
        const after = JSON.stringify({
            permissions: { allow: ['Bash(npm test)'], deny: [] },
        });
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, before, after);
        // The allow-list change is a pure narrowing (silent); the deny rule
        // removal is a genuine widening and must still fire, unaffected.
        expect(findings).toHaveLength(1);
        expect(findings[0].summary).toBe("Deny rule 'Bash(rm)' removed");
    });
    it('Task 5.8: does NOT report a permission as added when the same entry is expressed in a different Unicode normalization form (fixture)', () => {
        const findings = (0, widenedPermissions_1.detectWidenedPermissions)(filePath, readFixture('nfc-nfd-same-permission-entry', 'before.json'), readFixture('nfc-nfd-same-permission-entry', 'after.json'));
        expect(findings).toHaveLength(0);
    });
});

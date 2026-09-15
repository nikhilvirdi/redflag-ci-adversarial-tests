"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const formatFindingsComment_1 = require("./formatFindingsComment");
describe('Task 5.2: formatFindingsComment', () => {
    const sampleFindings = [
        {
            detectorId: 'diff-drift.hook-changed',
            severity: 'high',
            file: '.claude/settings.json',
            summary: "New hook 'PostToolUse' added",
            detail: "The head branch adds a new hook 'PostToolUse' with command './scripts/notify.sh' to " +
                ".claude/settings.json. Injecting or altering hooks is the attack vector behind " +
                "CVE-2025-59536, which exploits Claude Code's hooks by executing unauthorized commands " +
                'in .claude/settings.json.',
        },
        {
            detectorId: 'rule-file.invisible-unicode',
            severity: 'high',
            file: 'CLAUDE.md',
            summary: 'Invisible Unicode character (U+200B) found',
            detail: 'A zero-width space (U+200B) was found in CLAUDE.md at line 5, column 3. Invisible and ' +
                'bidirectional-control characters have no legitimate use in an instruction file and can ' +
                'be used to hide malicious instructions from human reviewers while an AI agent still ' +
                'reads and follows them.',
        },
        {
            detectorId: 'diff-drift.new-mcp-server',
            severity: 'warning',
            file: '.mcp.json',
            summary: "New MCP server 'example-server' added",
            detail: "The head branch adds a new MCP server entry named 'example-server' to .mcp.json that " +
                "was not present in the base branch. New tool servers should be reviewed before merge.",
        },
    ];
    it('matches the expected comment format for a multi-finding list (snapshot)', () => {
        expect((0, formatFindingsComment_1.formatFindingsComment)(sampleFindings)).toMatchSnapshot();
    });
    it('returns an empty string for an empty findings list', () => {
        expect((0, formatFindingsComment_1.formatFindingsComment)([])).toBe('');
    });
    it('uses singular "issue" for exactly one finding', () => {
        const result = (0, formatFindingsComment_1.formatFindingsComment)([sampleFindings[0]]);
        expect(result).toContain('RedFlag CI found 1 issue:');
        expect(result).not.toContain('1 issues');
    });
    it('uses plural "issues" for more than one finding', () => {
        const result = (0, formatFindingsComment_1.formatFindingsComment)(sampleFindings);
        expect(result).toContain(`RedFlag CI found ${sampleFindings.length} issues:`);
    });
    it('renders one bullet line per finding, in the order given (no re-sorting)', () => {
        const result = (0, formatFindingsComment_1.formatFindingsComment)(sampleFindings);
        const bulletLines = result.split('\n').filter((line) => line.startsWith('- '));
        expect(bulletLines).toHaveLength(3);
        expect(bulletLines[0]).toContain("New hook 'PostToolUse' added");
        expect(bulletLines[1]).toContain('Invisible Unicode character (U+200B) found');
        expect(bulletLines[2]).toContain("New MCP server 'example-server' added");
    });
    it('includes severity, file, summary, and detail (with its CVE reference) for each finding', () => {
        const result = (0, formatFindingsComment_1.formatFindingsComment)([sampleFindings[0]]);
        expect(result).toContain('**HIGH**');
        expect(result).toContain('`.claude/settings.json`');
        expect(result).toContain("New hook 'PostToolUse' added");
        expect(result).toContain('CVE-2025-59536');
    });
    describe('Task A.6: formatCumulativeDriftSection', () => {
        const cumulativeFinding = {
            detectorId: 'diff-drift.widened-permissions',
            severity: 'warning',
            file: '.claude/settings.json',
            summary: "Permission 'Bash(git diff)' added to allow-list",
            detail: "The head branch adds 'Bash(git diff)' to the allow-list in .claude/settings.json.",
        };
        it('returns an empty string when there are no cumulative findings', () => {
            expect((0, formatFindingsComment_1.formatCumulativeDriftSection)([])).toBe('');
        });
        it('uses singular "change" for exactly one cumulative finding', () => {
            const result = (0, formatFindingsComment_1.formatCumulativeDriftSection)([cumulativeFinding]);
            expect(result).toContain('1 additional change found');
            expect(result).not.toContain('1 additional changes');
        });
        it('uses plural "changes" for more than one', () => {
            const result = (0, formatFindingsComment_1.formatCumulativeDriftSection)([cumulativeFinding, { ...cumulativeFinding, summary: 'second' }]);
            expect(result).toContain('2 additional changes found');
        });
        it('explicitly frames the section as baseline drift, not this PR\'s own diff', () => {
            const result = (0, formatFindingsComment_1.formatCumulativeDriftSection)([cumulativeFinding]);
            expect(result).toContain('since the last known-good baseline');
            expect(result).toContain("not part of this PR's own diff");
        });
        it('renders findings in the exact same bullet format as the main section', () => {
            const mainResult = (0, formatFindingsComment_1.formatFindingsComment)([cumulativeFinding]);
            const cumulativeResult = (0, formatFindingsComment_1.formatCumulativeDriftSection)([cumulativeFinding]);
            const mainBullet = mainResult.split('\n').find((line) => line.startsWith('- '));
            const cumulativeBullet = cumulativeResult.split('\n').find((line) => line.startsWith('- '));
            expect(cumulativeBullet).toBe(mainBullet);
        });
        it('is a visually distinct section from formatFindingsComment\'s own header, not merged into it', () => {
            const result = (0, formatFindingsComment_1.formatCumulativeDriftSection)([cumulativeFinding]);
            expect(result).not.toContain('RedFlag CI found');
        });
    });
});

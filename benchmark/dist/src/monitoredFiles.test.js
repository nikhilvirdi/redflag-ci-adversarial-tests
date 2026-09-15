"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const monitoredFiles_1 = require("./monitoredFiles");
describe('filterMonitoredFiles', () => {
    it('returns no matches for a PR touching only unrelated files', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)(['README.md', 'src/index.ts', 'package.json']);
        expect(result.hasMatches).toBe(false);
        expect(result.matches).toEqual([]);
    });
    it('identifies a PR touching .mcp.json as a diff-drift match', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)(['.mcp.json']);
        expect(result.hasMatches).toBe(true);
        expect(result.matches).toEqual([{ path: '.mcp.json', engine: 'diff-drift' }]);
    });
    it.each([
        ['.mcp.json'],
        ['.cursor/mcp.json'],
        ['claude_desktop_config.json'],
        ['.claude/settings.json'],
    ])('identifies %s as a diff-drift match', (path) => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)([path]);
        expect(result.matches).toEqual([{ path, engine: 'diff-drift' }]);
    });
    it.each([['CLAUDE.md'], ['.github/copilot-instructions.md']])('identifies %s as a rule-file match', (path) => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)([path]);
        expect(result.matches).toEqual([{ path, engine: 'rule-file' }]);
    });
    it('matches a file under .cursor/rules/ via the directory wildcard, not just exact paths', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)(['.cursor/rules/security.mdc']);
        expect(result.hasMatches).toBe(true);
        expect(result.matches).toEqual([
            { path: '.cursor/rules/security.mdc', engine: 'rule-file' },
        ]);
    });
    it('matches a file nested in a subdirectory under .cursor/rules/', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)(['.cursor/rules/subdir/nested.mdc']);
        expect(result.matches).toEqual([
            { path: '.cursor/rules/subdir/nested.mdc', engine: 'rule-file' },
        ]);
    });
    it('does not match a path that merely resembles a monitored directory prefix', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)(['not-.cursor/rules/notes.md', 'src/.cursor/rules.md']);
        expect(result.hasMatches).toBe(false);
        expect(result.matches).toEqual([]);
    });
    it('picks out only the monitored files from a mixed list of changed files', () => {
        const result = (0, monitoredFiles_1.filterMonitoredFiles)([
            'README.md',
            '.mcp.json',
            'src/index.ts',
            '.cursor/rules/security.mdc',
            'package.json',
        ]);
        expect(result.hasMatches).toBe(true);
        expect(result.matches).toEqual([
            { path: '.mcp.json', engine: 'diff-drift' },
            { path: '.cursor/rules/security.mdc', engine: 'rule-file' },
        ]);
    });
});

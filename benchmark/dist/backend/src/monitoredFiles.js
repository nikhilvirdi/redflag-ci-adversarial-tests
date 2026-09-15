"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DIFF_DRIFT_FILES = void 0;
exports.filterMonitoredFiles = filterMonitoredFiles;
// Exported for baseline.ts's merge-triggered snapshot build (Task A.2): the
// baseline needs the full, current list of diff-drift file paths to capture
// on every merge, not just whichever ones a given PR happened to touch.
exports.DIFF_DRIFT_FILES = [
    '.mcp.json',
    '.cursor/mcp.json',
    'claude_desktop_config.json',
    '.claude/settings.json',
];
const RULE_FILE_EXACT_FILES = ['CLAUDE.md', '.github/copilot-instructions.md'];
const RULE_FILE_DIRECTORIES = ['.cursor/rules/'];
function matchEngine(path) {
    if (exports.DIFF_DRIFT_FILES.includes(path)) {
        return 'diff-drift';
    }
    if (RULE_FILE_EXACT_FILES.includes(path) ||
        RULE_FILE_DIRECTORIES.some((dir) => path.startsWith(dir))) {
        return 'rule-file';
    }
    return undefined;
}
function filterMonitoredFiles(changedFiles) {
    const matches = [];
    for (const path of changedFiles) {
        const engine = matchEngine(path);
        if (engine) {
            matches.push({ path, engine });
        }
    }
    return { hasMatches: matches.length > 0, matches };
}

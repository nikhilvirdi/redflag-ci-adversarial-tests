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
const monitoredFileDeleted_1 = require("./monitoredFileDeleted");
describe('DD-8: detectMonitoredFileDeleted', () => {
    const filePath = '.claude/settings.json';
    // Only a before.json fixture exists for this detector -- there is
    // deliberately no after.json, since the scenario under test IS the file's
    // absence in head, not any particular (empty) content for it.
    const before = fs.readFileSync(path.join(__dirname, '__fixtures__', 'dd8', 'settings-deleted', 'before.json'), 'utf-8');
    it('fires a HIGH-severity finding when a monitored file present in base is absent in head (fixture)', () => {
        const findings = (0, monitoredFileDeleted_1.detectMonitoredFileDeleted)(filePath, before, null);
        expect(findings).toHaveLength(1);
        expect(findings[0]).toEqual({
            detectorId: 'diff-drift.monitored-file-deleted',
            severity: 'high',
            file: filePath,
            summary: "Monitored file '.claude/settings.json' was deleted",
            detail: 'The head branch deletes .claude/settings.json, which previously defined MCP server, ' +
                'permission, and/or hook configuration. Deleting the file removes every constraint it ' +
                'defined in a single change, and every detector that compares against head content has ' +
                'nothing left to scan against -- this is flagged separately because the deletion itself, ' +
                'not any specific entry inside the file, is the risk.',
        });
    });
    it('does NOT fire when base is null (file never existed, nothing deleted)', () => {
        expect((0, monitoredFileDeleted_1.detectMonitoredFileDeleted)(filePath, null, null)).toHaveLength(0);
    });
    it('does NOT fire when head is present (not a deletion)', () => {
        expect((0, monitoredFileDeleted_1.detectMonitoredFileDeleted)(filePath, before, before)).toHaveLength(0);
    });
    it('does NOT fire when the file is newly added (base null, head present)', () => {
        expect((0, monitoredFileDeleted_1.detectMonitoredFileDeleted)(filePath, null, before)).toHaveLength(0);
    });
});

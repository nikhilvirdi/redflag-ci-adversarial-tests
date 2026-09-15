"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fileVersions_1 = require("./fileVersions");
function notFoundError() {
    return Object.assign(new Error('Not Found'), { status: 404 });
}
function fileResponse(content) {
    return { data: { type: 'file', content: Buffer.from(content).toString('base64'), encoding: 'base64' } };
}
describe('getFileVersions', () => {
    it('fetches the base and head contents of a file that exists on both refs', async () => {
        const getContent = jest.fn().mockImplementation(({ ref }) => {
            if (ref === 'main')
                return Promise.resolve(fileResponse('base contents'));
            if (ref === 'feature-branch')
                return Promise.resolve(fileResponse('head contents'));
            throw new Error(`unexpected ref: ${ref}`);
        });
        const getInstallationOctokit = jest.fn().mockResolvedValue({
            rest: { repos: { getContent } },
        });
        const app = { getInstallationOctokit };
        const versions = await (0, fileVersions_1.getFileVersions)(app, {
            installationId: 123,
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            baseRef: 'main',
            headRef: 'feature-branch',
        });
        expect(versions).toEqual({ base: 'base contents', head: 'head contents' });
        expect(getInstallationOctokit).toHaveBeenCalledWith(123);
        expect(getContent).toHaveBeenCalledWith({
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            ref: 'main',
        });
        expect(getContent).toHaveBeenCalledWith({
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            ref: 'feature-branch',
        });
    });
    it('returns null for the base version when the file is newly added', async () => {
        const getContent = jest.fn().mockImplementation(({ ref }) => {
            if (ref === 'main')
                return Promise.reject(notFoundError());
            return Promise.resolve(fileResponse('new file contents'));
        });
        const getInstallationOctokit = jest.fn().mockResolvedValue({
            rest: { repos: { getContent } },
        });
        const app = { getInstallationOctokit };
        const versions = await (0, fileVersions_1.getFileVersions)(app, {
            installationId: 123,
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            baseRef: 'main',
            headRef: 'feature-branch',
        });
        expect(versions).toEqual({ base: null, head: 'new file contents' });
    });
    it('returns null for the head version when the file is deleted', async () => {
        const getContent = jest.fn().mockImplementation(({ ref }) => {
            if (ref === 'feature-branch')
                return Promise.reject(notFoundError());
            return Promise.resolve(fileResponse('old file contents'));
        });
        const getInstallationOctokit = jest.fn().mockResolvedValue({
            rest: { repos: { getContent } },
        });
        const app = { getInstallationOctokit };
        const versions = await (0, fileVersions_1.getFileVersions)(app, {
            installationId: 123,
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            baseRef: 'main',
            headRef: 'feature-branch',
        });
        expect(versions).toEqual({ base: 'old file contents', head: null });
    });
    it('propagates errors that are not a 404', async () => {
        const serverError = Object.assign(new Error('Internal Server Error'), { status: 500 });
        const getContent = jest.fn().mockRejectedValue(serverError);
        const getInstallationOctokit = jest.fn().mockResolvedValue({
            rest: { repos: { getContent } },
        });
        const app = { getInstallationOctokit };
        await expect((0, fileVersions_1.getFileVersions)(app, {
            installationId: 123,
            owner: 'octo-org',
            repo: 'octo-repo',
            path: '.mcp.json',
            baseRef: 'main',
            headRef: 'feature-branch',
        })).rejects.toThrow('Internal Server Error');
    });
});

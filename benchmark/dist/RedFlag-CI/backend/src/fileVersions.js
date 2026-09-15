"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getFileVersions = getFileVersions;
exports.getFileAtRef = getFileAtRef;
async function getFileVersions(app, request) {
    const { installationId, owner, repo, path, baseRef, headRef } = request;
    const octokit = await app.getInstallationOctokit(installationId);
    const [base, head] = await Promise.all([
        fetchFileContent(octokit, owner, repo, path, baseRef),
        fetchFileContent(octokit, owner, repo, path, headRef),
    ]);
    return { base, head };
}
// Task A.2: a single-ref fetch for the baseline's merge-triggered snapshot
// build, which needs one file's content at the merge commit, not a
// base/head pair. Reuses fetchFileContent's own 404-as-null handling rather
// than duplicating it.
async function getFileAtRef(app, request) {
    const { installationId, owner, repo, path, ref } = request;
    const octokit = await app.getInstallationOctokit(installationId);
    return fetchFileContent(octokit, owner, repo, path, ref);
}
async function fetchFileContent(octokit, owner, repo, path, ref) {
    try {
        const { data } = await octokit.rest.repos.getContent({ owner, repo, path, ref });
        // The contents API also returns an array (directory listing) or a
        // symlink/submodule entry; only a plain file has decodable content.
        if (Array.isArray(data) || data.type !== 'file') {
            return null;
        }
        return Buffer.from(data.content, 'base64').toString('utf-8');
    }
    catch (error) {
        if (isNotFoundError(error)) {
            return null;
        }
        throw error;
    }
}
function isNotFoundError(error) {
    return (typeof error === 'object' &&
        error !== null &&
        'status' in error &&
        error.status === 404);
}

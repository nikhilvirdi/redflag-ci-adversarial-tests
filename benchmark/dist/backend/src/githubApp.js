"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onLimit = onLimit;
exports.createGitHubApp = createGitHubApp;
exports.getChangedFiles = getChangedFiles;
const app_1 = require("@octokit/app");
const rest_1 = require("@octokit/rest");
const plugin_throttling_1 = require("@octokit/plugin-throttling");
const config_1 = require("./config");
const logger_1 = require("./logger");
// Audit (Task 6.3): neither @octokit/app nor @octokit/rest retries or backs
// off a rate-limited request on their own -- a 403 (primary limit) or
// secondary/abuse-limit response just throws straight out of whichever REST
// call made it. @octokit/plugin-throttling was not installed; this wires it
// in. Its handlers are also where a rate limit becomes a distinctly logged
// event rather than an anonymous thrown error (see app.ts's webhook handler
// for what happens if retries are exhausted and it propagates anyway).
const ThrottledOctokit = rest_1.Octokit.plugin(plugin_throttling_1.throttling);
// Retries are capped, not unbounded: this is a webhook handler, not a batch
// job, so it should give up and let architecture.md section 2's fail-open
// policy take over (log distinctly, keep the check quiet, never block the
// PR) rather than hold the request open indefinitely against a sustained
// rate limit.
const MAX_RATE_LIMIT_RETRIES = 1;
function onLimit(kind) {
    return (retryAfter, options, _octokit, retryCount) => {
        logger_1.logger.warn(`GitHub API ${kind} rate limit hit, retrying`, {
            route: `${options.method} ${options.url}`,
            retryAfterSeconds: retryAfter,
            retryCount,
        });
        return retryCount < MAX_RATE_LIMIT_RETRIES;
    };
}
// @octokit/app's own constructor only ever passes {authStrategy, auth, log}
// to `new Octokit(...)` -- it has no option to forward a `throttle` config
// through `new App({...})`. Baking the handlers in via .defaults() is the
// only way they reach every Octokit instance @octokit/app creates
// (app.octokit itself, and every per-installation client from
// getInstallationOctokit): plugin-throttling throws at construction time if
// onRateLimit/onSecondaryRateLimit aren't present, so this isn't optional.
const GitHubOctokit = ThrottledOctokit.defaults({
    throttle: {
        onRateLimit: onLimit('primary'),
        onSecondaryRateLimit: onLimit('secondary'),
    },
});
function createGitHubApp() {
    const { appId, privateKey } = (0, config_1.getGitHubAppConfig)();
    return new app_1.App({ appId, privateKey, Octokit: GitHubOctokit });
}
async function getChangedFiles(app, request) {
    const { installationId, owner, repo, pullNumber } = request;
    const octokit = await app.getInstallationOctokit(installationId);
    // A PR touching >100 files needs more than one page, or anything past the
    // first 100 silently goes unseen -- octokit.paginate() (already pulled in
    // by @octokit/rest) walks every page and hands back the merged list.
    const files = await octokit.paginate(octokit.rest.pulls.listFiles, {
        owner,
        repo,
        pull_number: pullNumber,
        per_page: 100,
    });
    return files.map((file) => file.filename);
}

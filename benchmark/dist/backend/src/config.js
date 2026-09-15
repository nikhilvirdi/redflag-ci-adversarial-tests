"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getWebhookSecret = getWebhookSecret;
exports.getGitHubAppConfig = getGitHubAppConfig;
function getWebhookSecret() {
    const secret = process.env.GITHUB_WEBHOOK_SECRET;
    if (!secret) {
        throw new Error('GITHUB_WEBHOOK_SECRET environment variable is not set');
    }
    return secret;
}
function getGitHubAppConfig() {
    const appId = process.env.GITHUB_APP_ID;
    const privateKey = process.env.GITHUB_APP_PRIVATE_KEY;
    if (!appId) {
        throw new Error('GITHUB_APP_ID environment variable is not set');
    }
    if (!privateKey) {
        throw new Error('GITHUB_APP_PRIVATE_KEY environment variable is not set');
    }
    return {
        appId,
        // PEM keys stored in env vars commonly arrive with literal "\n" instead of real newlines.
        privateKey: privateKey.replace(/\\n/g, '\n'),
    };
}

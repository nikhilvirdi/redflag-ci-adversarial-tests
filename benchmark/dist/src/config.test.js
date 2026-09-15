"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config_1 = require("./config");
describe('getWebhookSecret', () => {
    afterEach(() => {
        delete process.env.GITHUB_WEBHOOK_SECRET;
    });
    it('throws when GITHUB_WEBHOOK_SECRET is not set', () => {
        delete process.env.GITHUB_WEBHOOK_SECRET;
        expect(() => (0, config_1.getWebhookSecret)()).toThrow('GITHUB_WEBHOOK_SECRET environment variable is not set');
    });
    it('throws when GITHUB_WEBHOOK_SECRET is an empty string', () => {
        process.env.GITHUB_WEBHOOK_SECRET = '';
        expect(() => (0, config_1.getWebhookSecret)()).toThrow('GITHUB_WEBHOOK_SECRET environment variable is not set');
    });
    it('returns the secret when set', () => {
        process.env.GITHUB_WEBHOOK_SECRET = 'a-webhook-secret';
        expect((0, config_1.getWebhookSecret)()).toBe('a-webhook-secret');
    });
});
describe('getGitHubAppConfig', () => {
    afterEach(() => {
        delete process.env.GITHUB_APP_ID;
        delete process.env.GITHUB_APP_PRIVATE_KEY;
    });
    it('throws when GITHUB_APP_ID is not set', () => {
        delete process.env.GITHUB_APP_ID;
        process.env.GITHUB_APP_PRIVATE_KEY = 'a-key';
        expect(() => (0, config_1.getGitHubAppConfig)()).toThrow('GITHUB_APP_ID environment variable is not set');
    });
    it('throws when GITHUB_APP_PRIVATE_KEY is not set', () => {
        process.env.GITHUB_APP_ID = '12345';
        delete process.env.GITHUB_APP_PRIVATE_KEY;
        expect(() => (0, config_1.getGitHubAppConfig)()).toThrow('GITHUB_APP_PRIVATE_KEY environment variable is not set');
    });
    it('returns the app id and normalizes escaped newlines in the private key', () => {
        process.env.GITHUB_APP_ID = '12345';
        process.env.GITHUB_APP_PRIVATE_KEY =
            '-----BEGIN RSA PRIVATE KEY-----\\nabc\\n-----END RSA PRIVATE KEY-----';
        const config = (0, config_1.getGitHubAppConfig)();
        expect(config.appId).toBe('12345');
        expect(config.privateKey).toBe('-----BEGIN RSA PRIVATE KEY-----\nabc\n-----END RSA PRIVATE KEY-----');
    });
});

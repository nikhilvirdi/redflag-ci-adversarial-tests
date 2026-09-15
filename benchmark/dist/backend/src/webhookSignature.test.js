"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = require("crypto");
const webhookSignature_1 = require("./webhookSignature");
const SECRET = 'test-secret';
const PAYLOAD = Buffer.from(JSON.stringify({ action: 'opened' }));
function sign(payload, secret) {
    return `sha256=${(0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex')}`;
}
describe('verifyWebhookSignature', () => {
    it('returns true for a valid signature', () => {
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, sign(PAYLOAD, SECRET), SECRET)).toBe(true);
    });
    it('returns false when the header is missing', () => {
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, undefined, SECRET)).toBe(false);
    });
    it('returns false when the header lacks the sha256= prefix', () => {
        const rawHex = (0, crypto_1.createHmac)('sha256', SECRET).update(PAYLOAD).digest('hex');
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, rawHex, SECRET)).toBe(false);
    });
    it('returns false, without throwing, for a same-length wrong value', () => {
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, sign(PAYLOAD, 'wrong-secret'), SECRET)).toBe(false);
    });
    it('returns false, without throwing, for a header shorter than the expected signature', () => {
        expect(() => (0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, 'sha256=abc', SECRET)).not.toThrow();
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, 'sha256=abc', SECRET)).toBe(false);
    });
    it('returns false, without throwing, for a header longer than the expected signature', () => {
        const tooLong = sign(PAYLOAD, SECRET) + 'ff';
        expect(() => (0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, tooLong, SECRET)).not.toThrow();
        expect((0, webhookSignature_1.verifyWebhookSignature)(PAYLOAD, tooLong, SECRET)).toBe(false);
    });
});

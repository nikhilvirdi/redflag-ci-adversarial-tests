"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWebhookSignature = verifyWebhookSignature;
const crypto_1 = require("crypto");
const SIGNATURE_PREFIX = 'sha256=';
function verifyWebhookSignature(payload, signatureHeader, secret) {
    if (!signatureHeader || !signatureHeader.startsWith(SIGNATURE_PREFIX)) {
        return false;
    }
    const expectedSignature = (0, crypto_1.createHmac)('sha256', secret).update(payload).digest('hex');
    const expected = Buffer.from(SIGNATURE_PREFIX + expectedSignature, 'utf8');
    const provided = Buffer.from(signatureHeader, 'utf8');
    if (expected.length !== provided.length) {
        return false;
    }
    return (0, crypto_1.timingSafeEqual)(expected, provided);
}

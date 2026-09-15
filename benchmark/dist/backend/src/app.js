"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createApp = createApp;
const express_1 = __importDefault(require("express"));
const config_1 = require("./config");
const webhookSignature_1 = require("./webhookSignature");
const processPullRequestEvent_1 = require("./processPullRequestEvent");
const logger_1 = require("./logger");
// GitHub retries a webhook delivery on timeout/failure using the same
// X-GitHub-Delivery header, so a retry must not reprocess the event -- since
// Task 6.1, a silent double-run would just re-edit the same comment/check
// run instead of visibly duplicating it, making the bug quieter and easier
// to miss. Tracked in memory, bounded to the last MAX_TRACKED_DELIVERIES
// ids: this is a stateless service (architecture.md section 2), so a
// restart resets dedup state and a delivery from just before restart could
// theoretically reprocess. That's an accepted gap for v1.2.0, not a defect
// -- durable dedup would need persistence, which is explicitly out of scope
// until v2 (architecture.md section 8).
const MAX_TRACKED_DELIVERIES = 1000;
function markSeen(seenDeliveryIds, deliveryId) {
    if (seenDeliveryIds.has(deliveryId)) {
        return true;
    }
    seenDeliveryIds.set(deliveryId, true);
    if (seenDeliveryIds.size > MAX_TRACKED_DELIVERIES) {
        const oldest = seenDeliveryIds.keys().next().value;
        seenDeliveryIds.delete(oldest);
    }
    return false;
}
// Task 6.3: githubApp.ts's throttling plugin already retries a rate-limited
// Octokit call with backoff; this only fires once retries are exhausted (or
// for a 429, which the plugin doesn't retry at all -- see githubApp.ts). It
// must be logged as its own condition, not folded into the generic catch
// below: architecture.md section 2's fail-open policy is for content this
// tool can't parse, not for never having reached GitHub's API to check in
// the first place, and those two failure modes look identical to an
// operator unless the logs say otherwise.
function isRateLimitError(error) {
    if (typeof error !== 'object' || error === null || !('status' in error)) {
        return false;
    }
    const status = error.status;
    return status === 403 || status === 429;
}
function createApp(githubApp) {
    const app = (0, express_1.default)();
    const webhookSecret = (0, config_1.getWebhookSecret)();
    const seenDeliveryIds = new Map();
    app.post('/webhook', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
        const signature = req.header('x-hub-signature-256');
        const payload = req.body;
        if (!Buffer.isBuffer(payload) || !(0, webhookSignature_1.verifyWebhookSignature)(payload, signature, webhookSecret)) {
            res.sendStatus(401);
            return;
        }
        const deliveryId = req.header('x-github-delivery');
        if (deliveryId && markSeen(seenDeliveryIds, deliveryId)) {
            res.sendStatus(200);
            return;
        }
        try {
            const event = JSON.parse(payload.toString('utf-8'));
            await (0, processPullRequestEvent_1.processPullRequestEvent)(githubApp, event);
        }
        catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            if (isRateLimitError(error)) {
                logger_1.logger.warn('GitHub API rate limit exhausted retries; no check posted for this event', {
                    message,
                });
            }
            else {
                logger_1.logger.error('Error processing webhook event', { message });
            }
        }
        res.sendStatus(200);
    });
    return app;
}

const xml2js = require("xml2js");
const Channel = require("../models/channel.model");
const queueManager = require("../queue");
const logger = require("../utils/logger");

module.exports = {
  /**
   * Handles Google's WebSub GET verification handshake challenge.
   */
  async verifyWebhook(req, res) {
    const challenge = req.query["hub.challenge"];
    const mode = req.query["hub.mode"]; // 'subscribe', 'unsubscribe', 'denied'
    const topic = req.query["hub.topic"] || "";
    const leaseSeconds = parseInt(req.query["hub.lease_seconds"], 10);

    // Extract channel ID from topic URL
    const channelIdMatch = topic.match(/channel_id=([^&]+)/);
    const channelId = channelIdMatch ? channelIdMatch[1] : null;

    logger.info(`[WEBHOOK VERIFY] mode=${mode} channel=${channelId} lease=${leaseSeconds}s`);

    if (!challenge) {
      logger.warn("[WEBHOOK VERIFY] Missing hub.challenge token.");
      return res.status(400).send("Challenge token required");
    }

    try {
      if (channelId) {
        if (mode === "subscribe") {
          // Compute lease expiration date
          const durationMs = leaseSeconds ? leaseSeconds * 1000 : 432000 * 1000; // default 5 days
          const expiresAt = new Date(Date.now() + durationMs);

          await Channel.findByIdAndUpdate(channelId, {
            subscriptionStatus: "subscribed",
            subscribedAt: new Date(),
            expiresAt,
            lastError: null,
          });

          logger.info(`[SUBSCRIBED CONFIRMED] Channel ${channelId} will expire at: ${expiresAt.toISOString()}`);
        } else if (mode === "unsubscribe") {
          await Channel.findByIdAndUpdate(channelId, {
            subscriptionStatus: "unsubscribed",
            expiresAt: null,
            lastError: null,
          });
          logger.info(`[UNSUBSCRIBED CONFIRMED] Channel ${channelId}`);
        } else if (mode === "denied") {
          await Channel.findByIdAndUpdate(channelId, {
            subscriptionStatus: "failed",
            expiresAt: null,
            lastError: "Subscription denied by Google Hub.",
          });
          logger.warn(`[WEBHOOK DENIED] Hub denied subscription for channel ${channelId}`);
        }
      }
    } catch (err) {
      logger.error(`Error updating channel subscription status for ${channelId}:`, err);
    }

    // Always send the challenge back with a 200 OK status
    res.status(200).send(challenge);
  },

  /**
   * Handles Google's WebSub POST XML stream update payloads.
   */
  async receiveNotification(req, res) {
    try {
      const xml = req.body;
      if (!xml || xml.trim().length === 0) {
        logger.warn("[WEBHOOK NOTIFICATION] Received empty payload body.");
        return res.sendStatus(200);
      }

      // Parse XML asynchronously
      const parsed = await xml2js.parseStringPromise(xml);
      const entry = parsed.feed?.entry?.[0];

      if (!entry) {
        logger.debug("[WEBHOOK NOTIFICATION] Structural ping without feed entry. Skipping.");
        return res.sendStatus(200);
      }

      const videoId = entry["yt:videoId"]?.[0];
      const channelId = entry["yt:channelId"]?.[0];
      const title = entry["title"]?.[0];

      if (!videoId || !channelId) {
        logger.warn("[WEBHOOK NOTIFICATION] Parsed XML is missing videoId or channelId. XML:", xml);
        return res.sendStatus(200);
      }

      logger.info(`[WEBHOOK NOTIFICATION] Update event: channel=${channelId} video=${videoId} title="${title}"`);

      // Offload processing to background queue, respond immediately
      await queueManager.queueWebhookJob(videoId, channelId);

      res.sendStatus(200);
    } catch (err) {
      logger.error("[WEBHOOK NOTIFICATION ERROR] Processing failure:", err);
      res.sendStatus(200); // Always respond 200 to acknowledge receipt to the Hub
    }
  },
};

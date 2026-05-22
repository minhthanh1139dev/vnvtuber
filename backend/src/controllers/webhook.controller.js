"use strict";

const xml2js = require("xml2js");
const channelScheduler = require("../scheduler/channel.scheduler");
const queueManager = require("../queue");
const logger = require("../utils/logger");
const { wrapController } = require("../utils/asyncHandler");

class WebhookController {
  async verifyWebhook(req, res) {
    const challenge = req.query["hub.challenge"];
    const mode = req.query["hub.mode"];
    const topic = req.query["hub.topic"] || "";
    const leaseSeconds = parseInt(req.query["hub.lease_seconds"], 10);

    const channelIdMatch = topic.match(/channel_id=([^&]+)/);
    const channelId = channelIdMatch ? channelIdMatch[1] : null;

    logger.info(
      `[WEBHOOK VERIFY] mode=${mode} channel=${channelId} lease=${leaseSeconds}s`,
    );

    if (!challenge) {
      logger.warn("[WEBHOOK VERIFY] Missing hub.challenge token.");
      return res.status(400).send("Challenge token required");
    }

    try {
      await channelScheduler.applyHubVerification(channelId, mode, leaseSeconds);
    } catch (err) {
      logger.error(
        `Error updating channel subscription status for ${channelId}:`,
        err,
      );
    }

    res.status(200).send(challenge);
  }

  async receiveNotification(req, res) {
    const xml = req.body;
    if (!xml || xml.trim().length === 0) {
      logger.warn("[WEBHOOK NOTIFICATION] Received empty payload body.");
      return res.sendStatus(200);
    }

    const parsed = await xml2js.parseStringPromise(xml);
    const entry = parsed.feed?.entry?.[0];

    if (!entry) {
      logger.debug(
        "[WEBHOOK NOTIFICATION] Structural ping without feed entry. Skipping.",
      );
      return res.sendStatus(200);
    }

    const videoId = entry["yt:videoId"]?.[0];
    const channelId = entry["yt:channelId"]?.[0];
    const title = entry["title"]?.[0];

    if (!videoId || !channelId) {
      logger.warn(
        "[WEBHOOK NOTIFICATION] Parsed XML is missing videoId or channelId. XML:",
        xml,
      );
      return res.sendStatus(200);
    }

    logger.info(
      `[WEBHOOK NOTIFICATION] Update event: channel=${channelId} video=${videoId} title="${title}"`,
    );

    await queueManager.queueWebhookJob(videoId, channelId);
    res.sendStatus(200);
  }
}

module.exports = wrapController(new WebhookController(), {
  webhookSafe: ["receiveNotification"],
});

"use strict";

/**
 * Channel background scheduler: WebSub hub + live detection (L1 worker, L2 poll).
 */
const axios = require("axios");
const config = require("../config");
const channelRepository = require("../repositories/channel.repository");
const channelService = require("../services/channel.service");
const ytbApiService = require("../services/ytb-api.service");
const channelProducer = require("../queue/channel.producer");
const {
  notifyStreamStartedOnDiscord,
  notifyStreamEndedOnDiscord,
} = require("../utils/discord-notify");
const logger = require("../utils/logger");

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";
const LOG = "[SCHEDULER:CHANNEL]";

class ChannelScheduler {
  constructor() {
    this._isPolling = false;
  }

  // --- WebSub (PubSubHubbub) ---

  async sendWebSubRequest(channelId, mode = "subscribe") {
    const topic = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
    const callback = `${config.baseUrl}/youtube/webhook`;

    const form = new URLSearchParams();
    form.append("hub.callback", callback);
    form.append("hub.topic", topic);
    form.append("hub.mode", mode);
    form.append("hub.verify", "async");

    logger.debug(`${LOG} WebSub ${mode} channel=${channelId}`);

    try {
      await axios.post(HUB_URL, form.toString(), {
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        timeout: 15000,
      });

      logger.info(`${LOG} WebSub ${mode.toUpperCase()} accepted channel=${channelId}`);

      await channelRepository.findByIdAndUpdate(channelId, {
        subscriptionStatus: mode === "subscribe" ? "pending" : "unsubscribed",
      });
      return true;
    } catch (err) {
      const errorMsg = err.response?.data || err.message;
      const errorStr = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);

      logger.error(`${LOG} WebSub ${mode.toUpperCase()} failed channel=${channelId}:`, errorMsg);

      await channelRepository.findByIdAndUpdate(channelId, {
        subscriptionStatus: "failed",
        lastError: errorStr,
      });

      return false;
    }
  }

  /** GET /youtube/webhook hub challenge (verify). */
  async applyHubVerification(channelId, mode, leaseSeconds) {
    if (!channelId) return;

    if (mode === "subscribe") {
      const durationMs = leaseSeconds ? leaseSeconds * 1000 : 432000 * 1000;
      const expiresAt = new Date(Date.now() + durationMs);

      await channelRepository.findByIdAndUpdate(channelId, {
        subscriptionStatus: "subscribed",
        subscribedAt: new Date(),
        expiresAt,
        lastError: null,
      });

      logger.info(`${LOG} WebSub subscribed channel=${channelId} expires=${expiresAt.toISOString()}`);
    } else if (mode === "unsubscribe") {
      await channelRepository.findByIdAndUpdate(channelId, {
        subscriptionStatus: "unsubscribed",
        expiresAt: null,
        lastError: null,
      });
      logger.info(`${LOG} WebSub unsubscribed channel=${channelId}`);
    } else if (mode === "denied") {
      await channelRepository.findByIdAndUpdate(channelId, {
        subscriptionStatus: "failed",
        expiresAt: null,
        lastError: "Subscription denied by Google Hub.",
      });
      logger.warn(`${LOG} WebSub hub denied channel=${channelId}`);
    }
  }

  async checkAndRenewSubscriptions() {
    logger.info(`${LOG} WebSub subscription health scan`);

    const threshold = new Date(Date.now() + 86400 * 1000);

    try {
      const expiringChannels = await channelRepository.findExpiringSubscriptions(threshold);

      if (expiringChannels.length === 0) {
        logger.info(`${LOG} WebSub all subscriptions healthy`);
        return;
      }

      logger.info(`${LOG} WebSub ${expiringChannels.length} channel(s) need renewal`);

      let delay = 0;
      const staggerDelay = config.websub.staggerDelayMs;

      for (const channel of expiringChannels) {
        const channelId = channel._id;
        const displayName = channel.displayName;
        const status = channel.subscriptionStatus;

        setTimeout(async () => {
          logger.info(`${LOG} WebSub queue renewal ${displayName || channelId} (${status})`);
          await channelProducer.queueSubscriptionJob(channelId, "subscribe");
        }, delay);

        delay += staggerDelay;
      }

      logger.info(
        `${LOG} WebSub scheduled ${expiringChannels.length} renewals over ${(delay / 1000).toFixed(1)}s`
      );
    } catch (error) {
      logger.error(`${LOG} WebSub scan failed:`, error);
      throw error;
    }
  }

  // --- Live detection ---

  /** L1 — BullMQ worker after WebSub notification. */
  async processWebhookVideoUpdate(videoId, channelId) {
    const item = await ytbApiService.getVideoDetails(videoId);
    if (!item) {
      logger.warn(`${LOG} Live video ${videoId} not found (deleted or private)`);
      return { status: "not_found" };
    }

    const liveStatus = item.snippet.liveBroadcastContent;
    const actualChannelId = item.snippet.channelId || channelId;
    const title = item.snippet.title;

    logger.info(`${LOG} Live webhook video=${videoId} status=${liveStatus}`);

    if (liveStatus !== "live" && liveStatus !== "upcoming") {
      return { status: "processed", liveStatus };
    }

    const channel = await channelRepository.findById(actualChannelId);
    const wasUpcoming =
      channel?.status?.livePhase === "upcoming" &&
      channel?.status?.currentLiveVideoId === videoId;
    const isNew =
      !channel?.status?.currentLiveVideoId ||
      channel.status.currentLiveVideoId !== videoId ||
      channel.status.livePhase !== liveStatus;

    await channelService.applyActiveBroadcast(actualChannelId, item);

    if (liveStatus === "live" && (isNew || wasUpcoming)) {
      await notifyStreamStartedOnDiscord(videoId, actualChannelId, title);
    }

    return { status: "processed", liveStatus };
  }

  /** L2 — backup poll for channels marked live/upcoming (cron every 30s). */
  async pollActiveChannels() {
    if (this._isPolling) return;
    this._isPolling = true;

    try {
      const channels = await channelRepository.findChannelsDueForPoll();
      if (!channels.length) {
        logger.debug(`${LOG} Live no active broadcast to poll`);
        return;
      }

      const now = Date.now();
      const due = channels.filter((ch) => {
        const intervalMs =
          ch.status?.livePhase === "upcoming"
            ? config.polling.upcomingIntervalMs
            : config.polling.liveIntervalMs;
        const last = ch.status?.lastPolledAt ? new Date(ch.status.lastPolledAt).getTime() : 0;
        return now - last >= intervalMs;
      });

      if (!due.length) {
        logger.debug(`${LOG} Live no channels due this cycle`);
        return;
      }

      const videoIds = due.map((ch) => ch.status.currentLiveVideoId).filter(Boolean);
      logger.info(`${LOG} Live polling ${videoIds.length} broadcast(s)`);

      const items = await ytbApiService.getBatchVideoDetails(videoIds);
      const itemsMap = new Map(items.map((item) => [item.id, item]));

      for (const ch of due) {
        const channelId = ch._id;
        const videoId = ch.status.currentLiveVideoId;
        const item = itemsMap.get(videoId);
        const title = ch.status?.liveTitle || "";
        const phase = ch.status?.livePhase;

        if (!item) {
          const errors = await channelService.touchPollError(
            channelId,
            ch.status?.pollErrorCount || 0
          );
          if (errors >= 5) {
            logger.warn(`${LOG} Live clearing stale broadcast channel=${channelId} video=${videoId}`);
            const endedAt = new Date();
            await channelService.clearBroadcast(channelId, endedAt);
            await notifyStreamEndedOnDiscord(
              videoId,
              channelId,
              title,
              ch.status?.startedAt || ch.status?.scheduledStartAt || endedAt,
              endedAt,
              0
            );
          }
          continue;
        }

        const currentPhase = item.snippet.liveBroadcastContent;
        const actualEndTimeStr = item.liveStreamingDetails?.actualEndTime;

        if (currentPhase === "none" || actualEndTimeStr) {
          const endedAt = actualEndTimeStr ? new Date(actualEndTimeStr) : new Date();
          const startAnchor =
            ch.status?.startedAt || ch.status?.scheduledStartAt || endedAt;

          logger.info(`${LOG} Live stream ended channel=${channelId} video=${videoId}`);
          await channelService.clearBroadcast(channelId, endedAt);
          await notifyStreamEndedOnDiscord(
            videoId,
            channelId,
            title,
            startAnchor,
            endedAt,
            Math.max(0, Math.floor((endedAt - startAnchor) / 1000))
          );
          continue;
        }

        if (phase === "upcoming" && currentPhase === "live") {
          logger.info(`${LOG} Live UPCOMING→LIVE channel=${channelId} video=${videoId}`);
          await channelService.applyActiveBroadcast(channelId, item);
          await notifyStreamStartedOnDiscord(
            videoId,
            channelId,
            item.snippet?.title || title
          );
          continue;
        }

        await channelService.applyActiveBroadcast(channelId, item);
      }
    } catch (error) {
      logger.error(`${LOG} Live poll failed:`, error);
    } finally {
      this._isPolling = false;
    }
  }
}

module.exports = new ChannelScheduler();

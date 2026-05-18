const { Worker } = require("bullmq");
const IORedis = require("ioredis");
const config = require("../config");
const logger = require("../utils/logger");
const Channel = require("../models/channel.model");
const Video = require("../models/video.model");
const youtubeService = require("../services/youtube.service");
const websubService = require("../services/websub.service");
const notifierService = require("../services/notifier.service");

const redisOpts = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  maxRetriesPerRequest: null,
};

let redisClient;
try {
  redisClient = new IORedis(redisOpts);
  redisClient.on("error", (err) => logger.error("Redis Worker Cache Connection Error:", err));
} catch (err) {
  logger.error("Failed to connect Redis Client for worker caching:", err);
}

/**
 * =========================================
 * WEBHOOK PROCESSING WORKER (Consolidated Video)
 * =========================================
 */
const webhookWorker = new Worker(
  "webhook-processing",
  async (job) => {
    const { videoId, channelId } = job.data;
    logger.info(`[WORKER] Processing webhook job for video=${videoId} channel=${channelId}`);

    // 1. Idempotency check via Redis
    if (redisClient) {
      try {
        const dupKey = `yt:dup:${videoId}`;
        const isDuplicate = await redisClient.get(dupKey);
        
        if (isDuplicate) {
          logger.info(`[DEDUPLICATED] Video ${videoId} already parsed. Skipping.`);
          return { status: "duplicate" };
        }

        // Lock for 15 minutes (900 seconds)
        await redisClient.set(dupKey, "1", "EX", 900);
      } catch (err) {
        logger.warn("Deduplication cache error, proceeding anyway:", err.message);
      }
    }

    // 2. Fetch YouTube details
    const item = await youtubeService.getVideoDetails(videoId);
    if (!item) {
      logger.warn(`[WORKER] Video ${videoId} details not found. It may be deleted or private.`);
      return { status: "not_found" };
    }

    const title = item.snippet.title;
    const liveStatus = item.snippet.liveBroadcastContent; // 'none', 'upcoming', 'live'
    const actualChannelId = item.snippet.channelId || channelId;

    logger.info(`[WORKER] Video status retrieved: video=${videoId} status=${liveStatus}`);

    // 3. Process video state (Consolidated into videos collection)
    if (liveStatus === "live" || liveStatus === "upcoming") {
      const existing = await Video.findOne({ videoId });
      
      const mappedLiveStatus = liveStatus === "live" ? "live" : "upcoming";
      const scheduledStartAt = item.liveStreamingDetails?.scheduledStartTime 
        ? new Date(item.liveStreamingDetails.scheduledStartTime)
        : null;
      const startedAt = item.liveStreamingDetails?.actualStartTime 
        ? new Date(item.liveStreamingDetails.actualStartTime)
        : new Date();

      if (!existing) {
        logger.info(`[NEW STREAM DETECTED] Adding consolidated video: ${videoId} (${liveStatus})`);

        await Video.findOneAndUpdate(
          { videoId },
          {
            channelId: actualChannelId,
            title,
            description: item.snippet.description || "",
            thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            type: "stream",
            liveStatus: mappedLiveStatus,
            scheduledStartAt,
            actualStartAt: startedAt,
          },
          { upsert: true }
        );

        // DENORMALIZATION OPTIMIZATION: Update Channel status
        if (liveStatus === "live") {
          await Channel.findByIdAndUpdate(actualChannelId, {
            "status.isLive": true,
            "status.currentLiveVideoId": videoId,
            "status.lastLiveAt": startedAt,
          });
        }

        // Notify started
        await notifierService.notifyStreamStarted(videoId, actualChannelId, title, item);
      } else {
        // Handle upcoming -> live transition
        if (existing.liveStatus === "upcoming" && liveStatus === "live") {
          logger.info(`[STREAM TRANSITION] ${videoId} transitioned from UPCOMING to LIVE.`);
            
          await Video.findOneAndUpdate(
            { videoId },
            {
              liveStatus: "live",
              actualStartAt: startedAt,
            }
          );

          // DENORMALIZATION OPTIMIZATION: Sync Channel status
          await Channel.findByIdAndUpdate(actualChannelId, {
            "status.isLive": true,
            "status.currentLiveVideoId": videoId,
            "status.lastLiveAt": startedAt,
          });
          
          // Re-send started event (now officially live!)
          await notifierService.notifyStreamStarted(videoId, actualChannelId, title, item);
        }
      }
    }

    return { status: "processed", liveStatus };
  },
  { 
    connection: redisOpts,
    concurrency: 10
  }
);

/**
 * =========================================
 * WEBSUB SUBSCRIPTIONS WORKER
 * =========================================
 */
const subscriptionWorker = new Worker(
  "websub-subscriptions",
  async (job) => {
    const { channelId, mode } = job.data;
    logger.info(`[WORKER] Running WebSub subscription task: channel=${channelId} mode=${mode}`);

    const success = await websubService.sendWebSubRequest(channelId, mode);
    if (!success) {
      throw new Error(`Failed to send WebSub subscription request for channel ${channelId}`);
    }

    return { channelId, status: "sent" };
  },
  {
    connection: redisOpts,
    concurrency: 2
  }
);

// Global Error Handlers
webhookWorker.on("error", (err) => logger.error("Webhook Worker Error:", err));
subscriptionWorker.on("error", (err) => logger.error("Subscription Worker Error:", err));

webhookWorker.on("failed", (job, err) => {
  logger.error(`Webhook job ${job.id} failed:`, err);
});

subscriptionWorker.on("failed", (job, err) => {
  logger.error(`Subscription job ${job.id} failed:`, err);
});

logger.info("BullMQ Workers running and connected to Redis.");

module.exports = {
  webhookWorker,
  subscriptionWorker,
};

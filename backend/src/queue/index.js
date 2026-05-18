const { Queue, QueueEvents } = require("bullmq");
const config = require("../config");
const logger = require("../utils/logger");

const connection = {
  host: config.redis.host,
  port: config.redis.port,
  password: config.redis.password,
  // Keep connections robust
  maxRetriesPerRequest: null,
};

logger.info(`Connecting queues to Redis at ${connection.host}:${connection.port}`);

let webhookQueue;
let subscriptionQueue;
let webhookQueueEvents;
let subscriptionQueueEvents;

try {
  // Initialize BullMQ Queues
  webhookQueue = new Queue("webhook-processing", { 
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: "exponential",
        delay: 5000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  });

  subscriptionQueue = new Queue("websub-subscriptions", { 
    connection,
    defaultJobOptions: {
      attempts: 5,
      backoff: {
        type: "exponential",
        delay: 10000,
      },
      removeOnComplete: true,
      removeOnFail: false,
    }
  });

  // Track Queue Events for debugging
  webhookQueueEvents = new QueueEvents("webhook-processing", { connection });
  subscriptionQueueEvents = new QueueEvents("websub-subscriptions", { connection });

  webhookQueueEvents.on("error", (error) => {
    logger.error("QueueEvent [webhook-processing] Error:", error);
  });

  subscriptionQueueEvents.on("error", (error) => {
    logger.error("QueueEvent [websub-subscriptions] Error:", error);
  });

  // Monitor connection errors
  webhookQueue.on("error", (err) => logger.error("Redis Webhook Queue Connection Error:", err));
  subscriptionQueue.on("error", (err) => logger.error("Redis Subscription Queue Connection Error:", err));

  logger.info("BullMQ Queues initialized successfully.");
} catch (error) {
  logger.error("Error creating BullMQ Queues. Is Redis running?", error);
}

// Helpers to queue jobs safely
async function queueWebhookJob(videoId, channelId) {
  if (!webhookQueue) {
    logger.warn(`Redis not available. Cannot queue webhook job for video ${videoId}`);
    return false;
  }
  try {
    const job = await webhookQueue.add(`video-${videoId}`, { videoId, channelId });
    logger.debug(`Queued Webhook job ${job.id} for video=${videoId} channel=${channelId}`);
    return true;
  } catch (err) {
    logger.error(`Failed to queue job for video ${videoId}:`, err);
    return false;
  }
}

async function queueSubscriptionJob(channelId, mode = "subscribe") {
  if (!subscriptionQueue) {
    logger.warn(`Redis not available. Cannot queue subscription job for channel ${channelId}`);
    return false;
  }
  try {
    const job = await subscriptionQueue.add(`sub-${channelId}-${mode}`, { channelId, mode });
    logger.debug(`Queued Subscription job ${job.id} for channel=${channelId} mode=${mode}`);
    return true;
  } catch (err) {
    logger.error(`Failed to queue subscription for channel ${channelId}:`, err);
    return false;
  }
}

module.exports = {
  webhookQueue,
  subscriptionQueue,
  queueWebhookJob,
  queueSubscriptionJob,
  redisConnection: connection,
};

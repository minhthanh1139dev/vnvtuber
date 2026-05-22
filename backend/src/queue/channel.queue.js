const { Queue } = require("bullmq");
const { redis } = require("../infra");
const logger = require("../utils/logger");

const connection = redis.createConnection();
const LOG = "[QUEUE:CHANNEL]";

const webhookQueue = new Queue("webhook-processing", {
  connection,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

const subscriptionQueue = new Queue("websub-subscriptions", {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: "exponential", delay: 10000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

webhookQueue.on("error", (err) => logger.error(`${LOG} Webhook queue error:`, err));
subscriptionQueue.on("error", (err) =>
  logger.error(`${LOG} Subscription queue error:`, err)
);

logger.info(`${LOG} Queues initialized (redis=${redis.getLabel()})`);

async function queueWebhookJob(videoId, channelId) {
  try {
    const job = await webhookQueue.add(
      "process",
      { videoId, channelId },
      { jobId: `video-${videoId}` }
    );
    logger.debug(`${LOG} Queued webhook job=${job.id} video=${videoId} channel=${channelId}`);
    return true;
  } catch (err) {
    logger.error(`${LOG} Failed to queue webhook video=${videoId}:`, err);
    return false;
  }
}

async function queueSubscriptionJob(channelId, mode = "subscribe") {
  try {
    const job = await subscriptionQueue.add(
      "process",
      { channelId, mode },
      { jobId: `sub-${channelId}-${mode}` }
    );
    logger.debug(`${LOG} Queued subscription job=${job.id} channel=${channelId} mode=${mode}`);
    return true;
  } catch (err) {
    logger.error(`${LOG} Failed to queue subscription channel=${channelId}:`, err);
    return false;
  }
}

module.exports = {
  connection,
  webhookQueue,
  subscriptionQueue,
  queueWebhookJob,
  queueSubscriptionJob,
};

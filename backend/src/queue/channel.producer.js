const { Queue } = require("bullmq");
const redis = require("../infra/redis");
const logger = require("../utils/logger");

const LOG = "[QUEUE:PRODUCER]";

class ChannelProducer {
  constructor() {
    this.connection = redis.createConnection();

    this.webhookQueue = new Queue("webhook-processing", {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: "exponential", delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.subscriptionQueue = new Queue("websub-subscriptions", {
      connection: this.connection,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: "exponential", delay: 10000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    });

    this.webhookQueue.on("error", (err) =>
      logger.error(`${LOG} Webhook queue error:`, err),
    );
    this.subscriptionQueue.on("error", (err) =>
      logger.error(`${LOG} Subscription queue error:`, err),
    );

    logger.debug(`${LOG} Ready (redis=${redis.getLabel()})`);
  }
}

const channelProducer = new ChannelProducer();

async function queueWebhookJob(videoId, channelId) {
  try {
    const job = await channelProducer.webhookQueue.add(
      "process",
      { videoId, channelId },
      { jobId: `video-${videoId}` },
    );
    logger.debug(
      `${LOG} Queued webhook job=${job.id} video=${videoId} channel=${channelId}`,
    );
    return true;
  } catch (err) {
    logger.error(`${LOG} Failed to queue webhook video=${videoId}:`, err);
    return false;
  }
}

async function queueSubscriptionJob(channelId, mode = "subscribe") {
  try {
    const job = await channelProducer.subscriptionQueue.add(
      "process",
      { channelId, mode },
      { jobId: `sub-${channelId}-${mode}` },
    );
    logger.debug(
      `${LOG} Queued subscription job=${job.id} channel=${channelId} mode=${mode}`,
    );
    return true;
  } catch (err) {
    logger.error(`${LOG} Failed to queue subscription channel=${channelId}:`, err);
    return false;
  }
}

module.exports = channelProducer;
module.exports.queueWebhookJob = queueWebhookJob;
module.exports.queueSubscriptionJob = queueSubscriptionJob;

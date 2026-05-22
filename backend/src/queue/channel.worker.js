const { Worker } = require("bullmq");
const config = require("../config");
const channelScheduler = require("../scheduler/channel.scheduler");
const { connection } = require("./channel.queue");
const logger = require("../utils/logger");

const LOG = "[QUEUE:CHANNEL]";

const webhookWorker = new Worker(
  "webhook-processing",
  async (job) => {
    const { videoId, channelId } = job.data;
    logger.info(`${LOG} Webhook job=${job.id} video=${videoId} channel=${channelId}`);
    return channelScheduler.processWebhookVideoUpdate(videoId, channelId);
  },
  { connection, concurrency: config.workers.webhookConcurrency }
);

const subscriptionWorker = new Worker(
  "websub-subscriptions",
  async (job) => {
    const { channelId, mode } = job.data;
    logger.info(`${LOG} Subscription job=${job.id} channel=${channelId} mode=${mode}`);

    const success = await channelScheduler.sendWebSubRequest(channelId, mode);
    if (!success) {
      throw new Error(`WebSub request failed for channel ${channelId}`);
    }

    return { channelId, status: "sent" };
  },
  { connection, concurrency: config.workers.subscriptionConcurrency }
);

webhookWorker.on("error", (err) => logger.error(`${LOG} Webhook worker error:`, err));
subscriptionWorker.on("error", (err) =>
  logger.error(`${LOG} Subscription worker error:`, err)
);
webhookWorker.on("failed", (job, err) =>
  logger.error(`${LOG} Webhook job ${job?.id} failed:`, err)
);
subscriptionWorker.on("failed", (job, err) =>
  logger.error(`${LOG} Subscription job ${job?.id} failed:`, err)
);

logger.info(
  `${LOG} Workers started (webhook=${config.workers.webhookConcurrency}, subscription=${config.workers.subscriptionConcurrency})`
);

async function closeChannelWorkers() {
  await Promise.allSettled([webhookWorker.close(), subscriptionWorker.close()]);
  logger.info(`${LOG} Workers shut down`);
}

module.exports = { closeChannelWorkers };

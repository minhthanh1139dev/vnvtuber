process.env.LOG_PROCESS = "scheduler";

const { mongo } = require("../../infra");
const googleApiKeyService = require("../../services/google-api-key.service");
const cronRegistry = require("../../scheduler/registry");
const channelJob = require("../../jobs/channel.job");
const logger = require("../../utils/logger");

async function bootstrap() {
  await mongo.connect();
  await googleApiKeyService.initialize();

  cronRegistry.register(channelJob.renewSubscriptions);
  cronRegistry.register(channelJob.pollActiveChannels);

  logger.info("[SCHEDULER] Process running — cron jobs registered");
}

async function gracefulShutdown(signal) {
  logger.info(`[SCHEDULER] ${signal} received — shutting down...`);
  cronRegistry.stopAll();
  await mongo.close();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap().catch((err) => {
  logger.error("[SCHEDULER] Failed to start:", err);
  process.exit(1);
});

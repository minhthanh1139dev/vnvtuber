process.env.LOG_PROCESS = "worker";

const mongo = require("../../infra/mongodb");
const googleApiKeyService = require("../../services/google-api-key.service");
const channelProducer = require("../../queue/channel.producer");
const channelConsumer = require("../../queue/channel.consumer");
const logger = require("../../utils/logger");

async function bootstrap() {
  await mongo.connect();
  await googleApiKeyService.initialize();

  channelConsumer.start(channelProducer.connection);
  logger.info("[WORKER] Ready — consuming BullMQ queues");
}

async function gracefulShutdown(signal) {
  logger.info(`[WORKER] ${signal} received — shutting down...`);
  await channelConsumer.close();
  await mongo.close();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap().catch((err) => {
  logger.error("[WORKER] Failed to start:", err);
  process.exit(1);
});

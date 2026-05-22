process.env.LOG_PROCESS = "worker";

const { mongo } = require("../../infra");
const googleApiKeyService = require("../../services/google-api-key.service");
const logger = require("../../utils/logger");

let closeWorkers;

async function bootstrap() {
  await mongo.connect();
  await googleApiKeyService.initialize();

  // Workers start on require (after DB is ready)
  ({ closeChannelWorkers: closeWorkers } = require("../../queue/channel.worker"));

  logger.info("[WORKER] Process running — consuming BullMQ queues");
}

async function gracefulShutdown(signal) {
  logger.info(`[WORKER] ${signal} received — shutting down...`);
  if (closeWorkers) await closeWorkers();
  await mongo.close();
  process.exit(0);
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

bootstrap().catch((err) => {
  logger.error("[WORKER] Failed to start:", err);
  process.exit(1);
});

process.env.LOG_PROCESS = "api";

const app = require("../../app");
const config = require("../../config");
const { mongo } = require("../../infra");
const googleApiKeyService = require("../../services/google-api-key.service");
const logger = require("../../utils/logger");

async function bootstrap() {
  await mongo.connect();
  await googleApiKeyService.initialize();

  const server = app.listen(config.port, () => {
    logger.info(`[API] Listening on port ${config.port}`);
    logger.info(`[API] Webhook callback: ${config.baseUrl}/youtube/webhook`);
    logger.info(`[API] Health check: http://localhost:${config.port}/api/health`);
  });

  async function gracefulShutdown(signal) {
    logger.info(`[API] ${signal} received — shutting down...`);
    server.close(async () => {
      await mongo.close();
      process.exit(0);
    });

    setTimeout(() => {
      logger.error("[API] Forced shutdown due to timeout.");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));
}

bootstrap().catch((err) => {
  logger.error("[API] Failed to start:", err);
  process.exit(1);
});

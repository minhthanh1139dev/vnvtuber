const express = require("express");
const config = require("./config");
const logger = require("./utils/logger");
const connectDb = require("./db");
const pollingEngine = require("./services/polling.service");
const schedulerEngine = require("./services/scheduler.service");

// Load routing modules
const webhookRoutes = require("./routes/webhook.routes");
const channelRoutes = require("./routes/channel.routes");
const authRoutes = require("./routes/auth.routes");

// Boot up BullMQ Workers
require("./queue/worker");

const app = express();

// Parse raw text for XML payload parsing
app.use(express.text({ type: "*/*", limit: "2mb" }));
app.use(express.json());

// Register API Routes
app.use("/youtube", webhookRoutes);
app.use("/api", channelRoutes);
app.use("/api/auth", authRoutes);

/**
 * =========================================
 * BOOTSTRAP APP
 * =========================================
 */
async function bootstrap() {
  // 1. Establish MongoDB connection pool
  await connectDb();

  // 2. Start Express listener
  const server = app.listen(config.port, () => {
    logger.info(`[SERVER STARTED] Listening on port ${config.port}`);
    logger.info(`[CALLBACK URL] Target endpoint: ${config.baseUrl}/youtube/webhook`);

    // 3. Start Polling and Cron engines
    pollingEngine.start();
    schedulerEngine.start();
  });

  // Graceful Shutdown handling
  function gracefulShutdown() {
    logger.info("Graceful shutdown initiated. Cleaning up resources...");
    
    pollingEngine.stop();
    
    server.close(async () => {
      logger.info("Express server closed.");
      
      const mongoose = require("mongoose");
      await mongoose.disconnect();
      logger.info("MongoDB connection disconnected.");
      
      process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
      logger.error("Forced shutdown due to timeout.");
      process.exit(1);
    }, 10000);
  }

  process.on("SIGTERM", gracefulShutdown);
  process.on("SIGINT", gracefulShutdown);
}

bootstrap();

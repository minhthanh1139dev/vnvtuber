process.env.LOG_PROCESS = "api";

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("../../config");
const {
  apiRouter,
  webhookRouter,
  API_PREFIX,
  WEBHOOK_PREFIX,
} = require("../../routes/index");
const { CORS_ORIGINS } = require("../../constants/app.constants");
const errorHandler = require("../../middlewares/errorHandler.middleware");
const { NOT_FOUND } = require("../../utils/response");
const mongo = require("../../infra/mongodb");
const redis = require("../../infra/redis");
const googleApiKeyService = require("../../services/google-api-key.service");
const logger = require("../../utils/logger");

/** Startup banner on console (API console is error-only) + always in logs/api.log */
function logApiStartup() {
  const localBase = `http://localhost:${config.port}`;
  const lines = [
    `[API] ${process.env.NODE_ENV || "development"} | db=${config.mongo.database} | redis=${redis.getLabel()}`,
    `[API] Google API keys: ${googleApiKeyService.getActiveCount()} active`,
    `[API] Listening  ${localBase}`,
    `[API] Health     ${localBase}/api/health`,
    `[API] Webhook    ${config.baseUrl}/youtube/webhook`,
  ];
  for (const line of lines) {
    logger.info(line);
    console.log(line);
  }
}

const app = express();

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);
app.use(compression());

const corsOptions =
  CORS_ORIGINS === "*"
    ? { origin: true }
    : {
        origin: CORS_ORIGINS,
        methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allowedHeaders: ["Content-Type", "Authorization"],
      };
app.use(cors(corsOptions));

app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));

/** WebSub Atom/XML — text parser only on webhook path (before JSON). */
app.use(
  WEBHOOK_PREFIX,
  express.text({
    type: ["text/xml", "application/xml", "application/atom+xml", "text/*"],
    limit: "2mb",
  }),
);
app.use(WEBHOOK_PREFIX, webhookRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(API_PREFIX, apiRouter);

app.use((req, res, next) => {
  next(
    new NOT_FOUND({
      message: `Route ${req.method} ${req.originalUrl} not found`,
    }),
  );
});

app.use(errorHandler);

async function bootstrap() {
  await mongo.connect();
  await googleApiKeyService.initialize();

  const server = app.listen(config.port, () => {
    logApiStartup();
  });

  async function gracefulShutdown(signal) {
    const line = `[API] ${signal} — shutting down...`;
    logger.info(line);
    console.log(line);
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

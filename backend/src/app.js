"use strict";

const express = require("express");
const cors = require("cors");
const compression = require("compression");
const helmet = require("helmet");
const morgan = require("morgan");
const config = require("./config");
const { apiRouter, webhookRouter, API_PREFIX, WEBHOOK_PREFIX } = require("./routes/index");
const { CORS_ORIGINS } = require("./constants/app.constants");
const errorHandler = require("./middlewares/errorHandler.middleware");
const { NOT_FOUND } = require("./utils/response");

const app = express();

if (config.trustProxy) {
  app.set("trust proxy", 1);
}

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
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
  })
);
app.use(WEBHOOK_PREFIX, webhookRouter);

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: false, limit: "10mb" }));
app.use(API_PREFIX, apiRouter);

app.use((req, res, next) => {
  next(new NOT_FOUND({ message: `Route ${req.method} ${req.originalUrl} not found` }));
});

app.use(errorHandler);

module.exports = app;

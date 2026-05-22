"use strict";

const logger = require("../utils/logger");
const {
  ErrorResponse,
  CONFLICT,
  INTERNAL_SERVER_ERROR,
} = require("../utils/response");

function toErrorResponse(err) {
  if (err instanceof ErrorResponse) {
    return err;
  }

  if (err?.code === 11000 || err?.code === "11000") {
    return new CONFLICT({ message: "Resource already exists" });
  }

  return new INTERNAL_SERVER_ERROR({
    message: err?.message || "An unexpected error occurred",
  });
}

function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  const error = toErrorResponse(err);
  const status = error.statusCode;
  const isClientError = status >= 400 && status < 500;

  if (isClientError) {
    logger.warn(`[HTTP ${status}] ${req.method} ${req.originalUrl}: ${error.message}`);
  } else {
    logger.error(`[HTTP ${status}] ${req.method} ${req.originalUrl}:`, err);
  }

  return error.send(res);
}

module.exports = errorHandler;

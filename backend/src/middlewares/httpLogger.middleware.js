"use strict";

const expressWinston = require("express-winston");
const logger = require("../utils/logger");
const { sanitizePayload, sanitizeHeaders, resolveUserId } = require("../utils/logSanitize");

const HEADER_BLACKLIST = ["authorization", "cookie", "set-cookie", "x-api-key"];

const BODY_BLACKLIST = [
  "password",
  "currentPassword",
  "newPassword",
  "confirmPassword",
  "token",
  "accessToken",
  "refreshToken",
  "secret",
  "apiKey",
  "key",
  "authorization",
  "jwt",
];

function requestFilter(req, propName) {
  if (propName === "headers") {
    return sanitizeHeaders(req.headers);
  }
  if (propName === "body") {
    return sanitizePayload(req.body, req);
  }
  if (propName === "query") {
    return sanitizePayload(req.query, req);
  }
  return req[propName];
}

function dynamicMeta(req) {
  const userId = resolveUserId(req);
  return userId ? { userId } : {};
}

const requestLogger = expressWinston.logger({
  winstonInstance: logger,
  expressFormat: true,
  colorize: process.env.NODE_ENV !== "production",
  meta: true,
  headerBlacklist: HEADER_BLACKLIST,
  bodyBlacklist: BODY_BLACKLIST,
  requestWhitelist: [...expressWinston.requestWhitelist, "body"],
  requestFilter,
  dynamicMeta,
  ignoreRoute: (req) => req.originalUrl === "/api/health",
});

const errorLogger = expressWinston.errorLogger({
  winstonInstance: logger,
  headerBlacklist: HEADER_BLACKLIST,
  bodyBlacklist: BODY_BLACKLIST,
  requestWhitelist: [...expressWinston.requestWhitelist, "body"],
  requestFilter,
  dynamicMeta,
});

module.exports = { requestLogger, errorLogger };

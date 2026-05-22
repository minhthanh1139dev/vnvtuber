const rateLimit = require("express-rate-limit");
const {
  GLOBAL_RATE_LIMIT_WINDOW_MS,
  GLOBAL_RATE_LIMIT_MAX,
  LOGIN_RATE_LIMIT_WINDOW_MS,
  LOGIN_MAX_FAILED_ATTEMPTS,
} = require("../constants/app.constants");
const { TOO_MANY_REQUESTS } = require("../utils/response");

function getClientIp(req) {
  const forwardedFor = req.headers["x-forwarded-for"];
  if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
    return forwardedFor.split(",")[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function buildLimiter({ windowMs, max, keyPrefix, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => {
      const username = (req.body?.username || "").toLowerCase();
      return username
        ? `${keyPrefix}:${getClientIp(req)}:${username}`
        : `${keyPrefix}:${getClientIp(req)}`;
    },
    handler: (req, res, next) => {
      next(new TOO_MANY_REQUESTS({ message }));
    },
  });
}

/** All /api routes */
const apiRateLimiter = buildLimiter({
  windowMs: GLOBAL_RATE_LIMIT_WINDOW_MS,
  max: GLOBAL_RATE_LIMIT_MAX,
  keyPrefix: "api",
  message: "Too many API requests. Please slow down.",
});

/** POST /api/auth/login — counts failed attempts per IP + username */
const loginRateLimiter = buildLimiter({
  windowMs: LOGIN_RATE_LIMIT_WINDOW_MS,
  max: LOGIN_MAX_FAILED_ATTEMPTS,
  keyPrefix: "login",
  message: "Too many failed login attempts. Try again later.",
  skipSuccessfulRequests: true,
});

module.exports = {
  apiRateLimiter,
  loginRateLimiter,
};

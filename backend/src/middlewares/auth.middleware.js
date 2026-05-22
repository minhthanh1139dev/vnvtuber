"use strict";

const userService = require("../services/user.service");
const logger = require("../utils/logger");
const { UNAUTHORIZED } = require("../utils/response");
const { asyncHandler } = require("../utils/asyncHandler");

async function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new UNAUTHORIZED({ message: "Access token is missing or invalid." });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = userService.verifyAccessToken(token);
    const user = await userService.findSessionUser(decoded.userId);
    if (!user) {
      throw new UNAUTHORIZED({
        message: "User associated with this token no longer exists.",
      });
    }
    req.user = user;
    next();
  } catch (err) {
    if (err.statusCode) {
      throw err;
    }
    if (err.name === "JsonWebTokenError" || err.name === "TokenExpiredError") {
      logger.warn(`Failed authentication attempt: ${err.message}`);
      throw new UNAUTHORIZED({
        message: "Authentication failed. Token may be expired.",
      });
    }
    throw err;
  }
}

module.exports = asyncHandler(authMiddleware);

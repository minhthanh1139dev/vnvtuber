"use strict";

const asyncHandler = require("express-async-handler");
const logger = require("./logger");

/**
 * WebSub notifications must ACK 200 even when processing fails.
 */
function webhookSafeHandler(fn) {
  return (req, res) => {
    Promise.resolve(fn(req, res)).catch((err) => {
      logger.error("[WEBHOOK NOTIFICATION ERROR] Processing failure:", err);
      if (!res.headersSent) {
        res.sendStatus(200);
      }
    });
  };
}

/** Bind controller methods with express-async-handler (optional exclude / webhook-safe). */
function wrapController(controller, { exclude = [], webhookSafe = [] } = {}) {
  const wrapped = {};
  const proto = Object.getPrototypeOf(controller);

  for (const key of Object.getOwnPropertyNames(proto)) {
    if (key === "constructor") continue;
    const fn = controller[key];
    if (typeof fn !== "function") continue;

    const bound = fn.bind(controller);
    if (exclude.includes(key)) {
      wrapped[key] = bound;
      continue;
    }
    if (webhookSafe.includes(key)) {
      wrapped[key] = webhookSafeHandler(bound);
      continue;
    }
    wrapped[key] = asyncHandler(bound);
  }

  return wrapped;
}

module.exports = {
  asyncHandler,
  webhookSafeHandler,
  wrapController,
};

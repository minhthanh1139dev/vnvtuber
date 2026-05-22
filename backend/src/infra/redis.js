"use strict";

const IORedis = require("ioredis");
const config = require("../config");
const logger = require("../utils/logger");

const CLIENT_OPTS = { maxRetriesPerRequest: null };

class Redis {
  createConnection() {
    const client = new IORedis(config.redis.url, CLIENT_OPTS);
    client.on("error", (err) => logger.error("[REDIS]", err));
    return client;
  }

  getLabel() {
    try {
      const { hostname, port } = new URL(config.redis.url);
      return `${hostname}:${port || "6379"}`;
    } catch {
      return config.redis.url;
    }
  }
}

module.exports = new Redis();

"use strict";

require("dotenv").config();

const env = (key, fallback = "") => (process.env[key] ?? fallback).toString().trim() || fallback;
const envInt = (key, fallback) => {
  const n = parseInt(process.env[key], 10);
  return Number.isFinite(n) ? n : fallback;
};
const envBool = (key) => process.env[key] === "true";

const port = envInt("PORT", 3000);

module.exports = {
  port,
  baseUrl: env("BASE_URL") || `http://localhost:${port}`,
  trustProxy: envBool("TRUST_PROXY"),

  mongo: {
    url: (env("MONGO_URL") || env("MONGO_URI") || "mongodb://127.0.0.1:27017").replace(/\/+$/, ""),
    database: env("MONGO_DATABASE") || env("MONGO_DB_NAME") || "vnvtuber",
  },

  redis: {
    url: env("REDIS_URL") || `redis://${env("REDIS_HOST", "127.0.0.1")}:${envInt("REDIS_PORT", 6379)}`,
  },

  youtubeApiKeys: env("YOUTUBE_API_KEYS")
    .split(",")
    .map((k) => k.trim())
    .filter((k) => k && !k.startsWith("YOUR_YOUTUBE_API_KEY")),

  polling: {
    liveIntervalMs: envInt("POLL_INTERVAL_LIVE_MS", 120_000),
    upcomingIntervalMs: envInt("POLL_INTERVAL_UPCOMING_MS", 600_000),
  },

  websub: {
    staggerDelayMs: envInt("WEBSUB_STAGGER_DELAY_MS", 1000),
  },

  workers: {
    webhookConcurrency: envInt("WEBHOOK_WORKER_CONCURRENCY", 3),
    subscriptionConcurrency: envInt("SUBSCRIPTION_WORKER_CONCURRENCY", 2),
  },

  jwtSecret: env("JWT_SECRET") || null,
  discordWebhookUrl: env("DISCORD_WEBHOOK_URL") || null,
  enableDiscordNotify: envBool("ENABLE_DISCORD_NOTIFY"),
  enableStreamSnapshots: envBool("ENABLE_STREAM_SNAPSHOTS"),
};

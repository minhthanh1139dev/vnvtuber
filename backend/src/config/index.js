require("dotenv").config();

// Parse YouTube API Keys (handles multiple keys separated by comma)
const rawKeys = process.env.YOUTUBE_API_KEYS || "";
const youtubeApiKeys = rawKeys
  .split(",")
  .map((k) => k.trim())
  .filter((k) => k.length > 0 && !k.startsWith("YOUR_YOUTUBE_API_KEY"));

module.exports = {
  port: parseInt(process.env.PORT, 10) || 3000,
  baseUrl: process.env.BASE_URL || `http://localhost:${process.env.PORT || 3000}`,
  mongoUri: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/vnvtuber",
  youtubeApiKeys,
  redis: {
    host: process.env.REDIS_HOST || "127.0.0.1",
    port: parseInt(process.env.REDIS_PORT, 10) || 6379,
    password: process.env.REDIS_PASSWORD || undefined,
  },
  polling: {
    liveIntervalMs: parseInt(process.env.POLL_INTERVAL_LIVE_MS, 10) || 120000, // 2 minutes
    upcomingIntervalMs: parseInt(process.env.POLL_INTERVAL_UPCOMING_MS, 10) || 600000, // 10 minutes
  },
  websub: {
    staggerDelayMs: parseInt(process.env.WEBSUB_STAGGER_DELAY_MS, 10) || 1000,
  },
  discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || null,
};

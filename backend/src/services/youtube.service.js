const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");

const keys = config.youtubeApiKeys;
let currentKeyIndex = 0;

if (keys.length === 0) {
  logger.warn("CRITICAL: No valid YouTube API keys found! Add them to your YOUTUBE_API_KEYS in .env.");
} else {
  logger.info(`YouTube API client initialized with ${keys.length} rotating keys.`);
}

function getActiveKey() {
  if (keys.length === 0) {
    throw new Error("No YouTube API keys available in system configuration.");
  }
  return keys[currentKeyIndex];
}

function rotateKey() {
  if (keys.length <= 1) return;
  const oldIndex = currentKeyIndex;
  currentKeyIndex = (currentKeyIndex + 1) % keys.length;
  logger.warn(`Rotated YouTube API Key: [Index ${oldIndex}] -> [Index ${currentKeyIndex}] due to quota depletion.`);
}

async function callYoutubeApi(url, params = {}) {
  let attempts = 0;
  const maxAttempts = Math.max(1, keys.length);

  while (attempts < maxAttempts) {
    const key = getActiveKey();
    try {
      logger.debug(`Calling YouTube API with key index ${currentKeyIndex}`);
      
      const response = await axios.get(url, {
        params: {
          ...params,
          key,
        },
        timeout: 10000,
      });

      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data?.error;
      const isQuotaError =
        status === 403 &&
        (errorData?.errors?.[0]?.reason === "quotaExceeded" ||
          errorData?.message?.toLowerCase().includes("quota") ||
          errorData?.message?.toLowerCase().includes("limit"));

      if (isQuotaError && keys.length > 1) {
        rotateKey();
        attempts++;
      } else if (isQuotaError && keys.length <= 1) {
        logger.error("Single YouTube API key is exhausted!");
        throw new Error("YouTube API Quota Exceeded. Add more keys to .env to resume.");
      } else {
        logger.error(
          `YouTube API Error [Status: ${status}]:`,
          errorData?.message || err.message
        );
        throw err;
      }
    }
  }

  throw new Error("All configured YouTube API keys are exhausted of quota.");
}

module.exports = {
  async getVideoDetails(videoId) {
    try {
      const url = "https://www.googleapis.com/youtube/v3/videos";
      const data = await callYoutubeApi(url, {
        id: videoId,
        part: "snippet,liveStreamingDetails",
      });

      return data.items?.[0] || null;
    } catch (err) {
      logger.error(`Failed to fetch details for video ${videoId}:`, err.message);
      throw err;
    }
  },

  async getBatchVideoDetails(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return [];
    }
    try {
      const url = "https://www.googleapis.com/youtube/v3/videos";
      const data = await callYoutubeApi(url, {
        id: videoIds.join(","),
        part: "snippet,liveStreamingDetails",
      });

      return data.items || [];
    } catch (err) {
      logger.error(`Failed to fetch batch details for videos [${videoIds.join(", ")}]:`, err.message);
      throw err;
    }
  },

  async getChannelDetails(channelId) {
    try {
      const url = "https://www.googleapis.com/youtube/v3/channels";
      const isArray = Array.isArray(channelId);
      const ids = isArray ? channelId.join(",") : channelId;
      
      const data = await callYoutubeApi(url, {
        id: ids,
        part: "snippet,statistics",
      });

      return isArray ? (data.items || []) : (data.items?.[0] || null);
    } catch (err) {
      logger.error(`Failed to fetch details for channel(s) ${channelId}:`, err.message);
      throw err;
    }
  },
};

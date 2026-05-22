"use strict";

const axios = require("axios");
const googleApiKeyService = require("./google-api-key.service");
const logger = require("../utils/logger");
const { SERVICE_UNAVAILABLE } = require("../utils/response");

async function callYoutubeApi(url, params = {}) {
  await googleApiKeyService.ensureReady();

  let attempts = 0;
  const maxAttempts = Math.max(1, googleApiKeyService.getActiveCount());

  while (attempts < maxAttempts) {
    const entry = await googleApiKeyService.pickKey();
    if (!entry) {
      throw new SERVICE_UNAVAILABLE({ message: "No active Google API keys available." });
    }

    try {
      logger.debug(
        `[YTB API] key id=${entry.id} requests=${entry.requestCount} (${googleApiKeyService.maskKey(entry.key)})`
      );

      const response = await axios.get(url, {
        params: { ...params, key: entry.key },
        timeout: 10000,
      });

      await googleApiKeyService.recordSuccessfulUse(entry.id);
      return response.data;
    } catch (err) {
      const status = err.response?.status;
      const errorData = err.response?.data?.error;
      const isQuotaError =
        status === 403 &&
        (errorData?.errors?.[0]?.reason === "quotaExceeded" ||
          errorData?.message?.toLowerCase().includes("quota") ||
          errorData?.message?.toLowerCase().includes("limit"));

      if (isQuotaError) {
        const errMsg = errorData?.message || "quotaExceeded";
        await googleApiKeyService.markExhausted(entry.id, errMsg);
        attempts++;
        await googleApiKeyService.ensureReady().catch(() => {});
        if (googleApiKeyService.hasActiveKeys()) {
          continue;
        }
        logger.error("[YTB API] All keys exhausted!");
        throw new SERVICE_UNAVAILABLE({
          message: "YouTube API quota exceeded for all keys. Add or re-enable keys in admin.",
        });
      }

      logger.error(
        `[YTB API] Error [Status: ${status}]:`,
        errorData?.message || err.message
      );
      throw err;
    }
  }

  throw new SERVICE_UNAVAILABLE({
    message: "All configured Google API keys are exhausted of quota.",
  });
}

class YtbApiService {
  async getVideoDetails(videoId) {
    const url = "https://www.googleapis.com/youtube/v3/videos";
    const data = await callYoutubeApi(url, {
      id: videoId,
      part: "snippet,liveStreamingDetails,statistics",
    });
    return data.items?.[0] || null;
  }

  async getBatchVideoDetails(videoIds) {
    if (!Array.isArray(videoIds) || videoIds.length === 0) {
      return [];
    }
    const url = "https://www.googleapis.com/youtube/v3/videos";
    const data = await callYoutubeApi(url, {
      id: videoIds.join(","),
      part: "snippet,liveStreamingDetails,statistics",
    });
    return data.items || [];
  }

  async getChannelLiveVideo(channelId) {
    const url = "https://www.googleapis.com/youtube/v3/search";
    const data = await callYoutubeApi(url, {
      part: "snippet",
      channelId,
      eventType: "live",
      type: "video",
      maxResults: 1,
    });
    return data.items?.[0] || null;
  }

  async getChannelDetails(channelId) {
    const url = "https://www.googleapis.com/youtube/v3/channels";
    const isArray = Array.isArray(channelId);
    const ids = isArray ? channelId.join(",") : channelId;

    const data = await callYoutubeApi(url, {
      id: ids,
      part: "snippet,statistics",
    });

    return isArray ? (data.items || []) : (data.items?.[0] || null);
  }

  async getChannelRecentBroadcasts(channelId, maxResults = 12) {
    const channelUrl = "https://www.googleapis.com/youtube/v3/channels";
    const channelData = await callYoutubeApi(channelUrl, {
      id: channelId,
      part: "contentDetails",
    });

    const uploadsPlaylistId =
      channelData.items?.[0]?.contentDetails?.relatedPlaylists?.uploads || null;

    if (!uploadsPlaylistId) {
      return [];
    }

    const playlistUrl = "https://www.googleapis.com/youtube/v3/playlistItems";
    const playlistData = await callYoutubeApi(playlistUrl, {
      playlistId: uploadsPlaylistId,
      part: "contentDetails",
      maxResults,
    });

    const videoIds = Array.from(
      new Set(
        (playlistData.items || [])
          .map((item) => item?.contentDetails?.videoId)
          .filter(Boolean)
      )
    );

    if (videoIds.length === 0) {
      return [];
    }

    return this.getBatchVideoDetails(videoIds);
  }
}

module.exports = new YtbApiService();

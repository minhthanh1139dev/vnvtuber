"use strict";

/**
 * YouTube HTML scrape — no API key / quota (optional backup; not scheduled in MVP).
 */
const axios = require("axios");
const logger = require("./logger");

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

class YtbScrape {
  parseYouTubeNumber(numStr) {
    if (!numStr) return 0;
    return parseInt(String(numStr).replace(/[,.]/g, ""), 10) || 0;
  }

  parseYoutubeLivePage(html) {
    const isLive =
      html.includes('"isLive":true') ||
      html.includes('"style":"LIVE"') ||
      html.includes('"iconType":"LIVE"');

    const videoIdMatch = html.match(/"videoId":"([a-zA-Z0-9_-]{11})"/);
    const videoId = videoIdMatch ? videoIdMatch[1] : null;

    let viewers = 0;
    let likes = 0;
    let totalViews = 0;

    if (isLive) {
      const concurrentMatch = html.match(
        /"viewCount":\{"videoViewCountRenderer":\{"viewCount":\{"runs":\[\{"text":"([0-9,.]+)"\}/,
      );
      viewers = concurrentMatch
        ? this.parseYouTubeNumber(concurrentMatch[1])
        : 0;

      const likeMatch = html.match(
        /<meta itemprop="interactionType" content="https:\/\/schema\.org\/LikeAction">\s*<meta itemprop="userInteractionCount" content="(\d+)">/,
      );
      likes = likeMatch ? parseInt(likeMatch[1], 10) : 0;

      const totalViewsMatch = html.match(
        /<meta itemprop="interactionType" content="https:\/\/schema\.org\/WatchAction">\s*<meta itemprop="userInteractionCount" content="(\d+)">/,
      );
      totalViews = totalViewsMatch ? parseInt(totalViewsMatch[1], 10) : 0;
    }

    return { isLive, videoId, viewers, likes, totalViews };
  }

  buildLivePageUrl(channelId) {
    if (!channelId || !channelId.startsWith("UC")) {
      throw new Error("[YTB SCRAPE] Requires YouTube channel id (UC...).");
    }
    return `https://www.youtube.com/channel/${channelId}/live`;
  }

  async fetchChannelLivePage(channelId, timeoutMs = 15000) {
    const url = this.buildLivePageUrl(channelId);
    logger.debug(`[YTB SCRAPE] GET ${url}`);

    const response = await axios.get(url, {
      headers: FETCH_HEADERS,
      timeout: timeoutMs,
      validateStatus: (status) => status >= 200 && status < 400,
      maxRedirects: 5,
    });

    return this.parseYoutubeLivePage(response.data || "");
  }

  sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

module.exports = new YtbScrape();

"use strict";

/**
 * Discord webhook helper — not in-app notifications.
 * Used by scheduler/channel.scheduler.js when ENABLE_DISCORD_NOTIFY=true.
 */
const axios = require("axios");
const config = require("../config");
const logger = require("./logger");

async function postDiscordEmbed(embed) {
  if (!config.enableDiscordNotify) {
    return;
  }
  if (!config.discordWebhookUrl) {
    logger.debug("[DISCORD] Skipped — DISCORD_WEBHOOK_URL not set.");
    return;
  }

  try {
    await axios.post(
      config.discordWebhookUrl,
      {
        embeds: [
          {
            ...embed,
            timestamp: new Date().toISOString(),
          },
        ],
      },
      { timeout: 10000 }
    );
    logger.info(`[DISCORD] Posted: "${embed.title}"`);
  } catch (err) {
    logger.error("[DISCORD] Webhook failed:", err.response?.data || err.message);
  }
}

/** No-op unless ENABLE_DISCORD_NOTIFY=true. */
async function notifyStreamStartedOnDiscord(videoId, channelId, title) {
  logger.info(`[LIVE EVENT] started video=${videoId} channel=${channelId} title="${title}"`);

  await postDiscordEmbed({
    title: "🔴 LIVESTREAM STARTED!",
    description: `**${title}**\n\n[Watch Stream](https://www.youtube.com/watch?v=${videoId}) | [Channel](https://www.youtube.com/channel/${channelId})`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    color: 16711680,
    thumbnail: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
    fields: [
      { name: "Channel ID", value: `\`${channelId}\``, inline: true },
      { name: "Video ID", value: `\`${videoId}\``, inline: true },
    ],
    footer: { text: "VNvtuber · Discord webhook" },
  });
}

/** No-op unless ENABLE_DISCORD_NOTIFY=true. */
async function notifyStreamEndedOnDiscord(
  videoId,
  channelId,
  title,
  startedAtDate,
  endedAtDate,
  durationSeconds
) {
  logger.info(`[LIVE EVENT] ended video=${videoId} channel=${channelId} title="${title}"`);

  const hours = Math.floor(durationSeconds / 3600);
  const minutes = Math.floor((durationSeconds % 3600) / 60);
  const startTimestamp = Math.floor(startedAtDate.getTime() / 1000);
  const endTimestamp = Math.floor(endedAtDate.getTime() / 1000);

  await postDiscordEmbed({
    title: "⚫ LIVESTREAM ENDED",
    description: `**${title}**\n\n[Video](https://www.youtube.com/watch?v=${videoId}) | [Channel](https://www.youtube.com/channel/${channelId})`,
    url: `https://www.youtube.com/watch?v=${videoId}`,
    color: 8421504,
    thumbnail: { url: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` },
    fields: [
      { name: "Duration", value: `${hours}h ${minutes}m`, inline: true },
      { name: "Start", value: `<t:${startTimestamp}:F>`, inline: true },
      { name: "End", value: `<t:${endTimestamp}:F>`, inline: true },
    ],
    footer: { text: "VNvtuber · Discord webhook" },
  });
}

module.exports = {
  notifyStreamStartedOnDiscord,
  notifyStreamEndedOnDiscord,
};

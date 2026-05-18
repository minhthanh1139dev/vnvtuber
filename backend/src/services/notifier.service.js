const axios = require("axios");
const config = require("../config");
const logger = require("../utils/logger");

async function sendDiscordNotification(embed) {
  if (!config.discordWebhookUrl) {
    logger.debug("Discord webhook URL not configured. Skipping Discord post.");
    return;
  }

  try {
    await axios.post(config.discordWebhookUrl, {
      embeds: [
        {
          ...embed,
          timestamp: new Date().toISOString(),
        },
      ],
    }, {
      timeout: 10000,
    });
    logger.info(`Discord notification successfully posted for: "${embed.title}"`);
  } catch (err) {
    logger.error("Failed to send Discord webhook:", err.response?.data || err.message);
  }
}

module.exports = {
  async notifyStreamStarted(videoId, channelId, title, rawDetails = {}) {
    logger.info(`[EVENT] STREAM STARTED: video=${videoId} channel=${channelId} title="${title}"`);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    
    const embed = {
      title: "🔴 LIVESTREAM STARTED!",
      description: `**${title}**\n\n[Watch Stream](${videoUrl}) | [Visit Channel](${channelUrl})`,
      url: videoUrl,
      color: 16711680, // Red
      thumbnail: {
        url: thumbnailUrl,
      },
      fields: [
        {
          name: "Channel ID",
          value: `\`${channelId}\``,
          inline: true,
        },
        {
          name: "Video ID",
          value: `\`${videoId}\``,
          inline: true,
        },
      ],
      footer: {
        text: "YouTube Live Tracker Engine",
      },
    };

    await sendDiscordNotification(embed);
  },

  async notifyStreamEnded(videoId, channelId, title, startedAtDate, endedAtDate, durationSeconds, rawDetails = {}) {
    logger.info(`[EVENT] STREAM ENDED: video=${videoId} channel=${channelId} title="${title}"`);

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const channelUrl = `https://www.youtube.com/channel/${channelId}`;
    const thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const hours = Math.floor(durationSeconds / 3600);
    const minutes = Math.floor((durationSeconds % 3600) / 60);
    const durationStr = `${hours}h ${minutes}m`;

    const startTimestamp = Math.floor(startedAtDate.getTime() / 1000);
    const endTimestamp = Math.floor(endedAtDate.getTime() / 1000);

    const embed = {
      title: "⚫ LIVESTREAM ENDED",
      description: `**${title}**\n\n[Video Link](${videoUrl}) | [Channel Link](${channelUrl})`,
      url: videoUrl,
      color: 8421504, // Grey
      thumbnail: {
        url: thumbnailUrl,
      },
      fields: [
        {
          name: "Duration",
          value: durationStr,
          inline: true,
        },
        {
          name: "Start Time",
          value: `<t:${startTimestamp}:F>`,
          inline: true,
        },
        {
          name: "End Time",
          value: `<t:${endTimestamp}:F>`,
          inline: true,
        },
      ],
      footer: {
        text: "YouTube Live Tracker Engine",
      },
    };

    await sendDiscordNotification(embed);
  },
};

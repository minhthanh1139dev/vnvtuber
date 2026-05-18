const axios = require("axios");
const config = require("../config");
const Channel = require("../models/channel.model");
const logger = require("../utils/logger");

const HUB_URL = "https://pubsubhubbub.appspot.com/subscribe";

module.exports = {
  /**
   * Sends a WebSub subscribe/unsubscribe request to the PubSubHubbub hub.
   * 
   * @param {string} channelId YouTube Channel ID
   * @param {'subscribe'|'unsubscribe'} mode Mode
   * @returns {Promise<boolean>} Success status
   */
  async sendWebSubRequest(channelId, mode = "subscribe") {
    const topic = `https://www.youtube.com/xml/feeds/videos.xml?channel_id=${channelId}`;
    const callback = `${config.baseUrl}/youtube/webhook`;

    const form = new URLSearchParams();
    form.append("hub.callback", callback);
    form.append("hub.topic", topic);
    form.append("hub.mode", mode);
    form.append("hub.verify", "async");

    logger.debug(`Sending WebSub ${mode} request for channel ${channelId} to ${HUB_URL}`);

    try {
      await axios.post(HUB_URL, form.toString(), {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        timeout: 15000,
      });

      logger.info(`WebSub [${mode.toUpperCase()} REQUEST ACCEPTED] channel=${channelId}`);
      
      const updateData = {
        subscriptionStatus: mode === "subscribe" ? "pending" : "unsubscribed",
      };
      
      await Channel.findByIdAndUpdate(channelId, updateData);
      return true;
    } catch (err) {
      const errorMsg = err.response?.data || err.message;
      const errorStr = typeof errorMsg === "string" ? errorMsg : JSON.stringify(errorMsg);
      
      logger.error(`WebSub [${mode.toUpperCase()} ERROR] channel=${channelId}:`, errorMsg);
      
      await Channel.findByIdAndUpdate(channelId, {
        subscriptionStatus: "failed",
        lastError: errorStr,
      });
      
      return false;
    }
  },
};

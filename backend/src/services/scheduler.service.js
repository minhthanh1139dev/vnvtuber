const cron = require("node-cron");
const Channel = require("../models/channel.model");
const queueManager = require("../queue");
const config = require("../config");
const logger = require("../utils/logger");

async function checkAndRenewSubscriptions() {
  logger.info("[CRON] Initiating MongoDB subscription health scan...");

  // Expiration threshold: 24 hours from now
  const threshold = new Date(Date.now() + 86400 * 1000);

  try {
    // Find channels where:
    // - status is not 'subscribed'
    // - OR expiresAt is null
    // - OR expiresAt is less than or equal to 24 hours from now
    const expiringChannels = await Channel.find({
      $or: [
        { subscriptionStatus: { $ne: "subscribed" } },
        { expiresAt: null },
        { expiresAt: { $lte: threshold } },
      ],
    });
    
    if (expiringChannels.length === 0) {
      logger.info("[CRON] All channel subscriptions are active and healthy. No renewals needed.");
      return;
    }

    logger.info(`[CRON] Found ${expiringChannels.length} channel(s) requiring WebSub renewal.`);

    let delay = 0;
    const staggerDelay = config.websub.staggerDelayMs;

    for (const channel of expiringChannels) {
      const channelId = channel._id;
      const displayName = channel.displayName;
      const status = channel.subscriptionStatus;
      
      setTimeout(async () => {
        logger.info(`[CRON QUEUE] Queuing renewal for: ${displayName || channelId} (Status: ${status})`);
        await queueManager.queueSubscriptionJob(channelId, "subscribe");
      }, delay);

      delay += staggerDelay;
    }

    logger.info(`[CRON] Finished scheduling ${expiringChannels.length} renewals staggered over ${(delay / 1000).toFixed(1)}s.`);
  } catch (error) {
    logger.error("[CRON] Error during MongoDB subscription check:", error);
  }
}

function start() {
  logger.info("Starting MongoDB WebSub Cron Lifecycle Manager...");

  // Scan 5s after startup
  setTimeout(() => {
    checkAndRenewSubscriptions();
  }, 5000);

  // Scan every 4 hours
  cron.schedule("0 */4 * * *", () => {
    checkAndRenewSubscriptions();
  });
}

module.exports = {
  start,
  checkAndRenewSubscriptions,
};

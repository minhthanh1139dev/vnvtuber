const channelScheduler = require("../scheduler/channel.scheduler");

module.exports = {
  renewSubscriptions: {
    name: "WebSub Subscription Renewal",
    schedule: "0 */4 * * *",
    runOnInit: true,
    action: async () => {
      await channelScheduler.checkAndRenewSubscriptions();
    },
  },
  pollActiveChannels: {
    name: "Live broadcast polling (L2 backup)",
    schedule: "*/30 * * * * *",
    runOnInit: true,
    action: async () => {
      await channelScheduler.pollActiveChannels();
    },
  },
};

const express = require("express");
const { API_PREFIX, WEBHOOK_PREFIX } = require("../constants/app.constants");
const { apiRateLimiter } = require("../middlewares/rateLimit.middleware");
const webhookRoutes = require("./webhook.routes");
const channelRoutes = require("./channel.routes");
const authRoutes = require("./auth.routes");
const sponsorRoutes = require("./sponsor.routes");
const googleApiKeyRoutes = require("./google-api-key.routes");
const { OK } = require("../utils/response");

const router = express.Router();

router.use(apiRateLimiter);

router.get("/health", (req, res) => {
  new OK({ message: "VNvtuber API is healthy", data: { service: "vnvtuber-api" } }).send(res);
});

router.use("/channels", channelRoutes);
router.use("/sponsors", sponsorRoutes);
router.use("/auth", authRoutes);
router.use("/google-api-keys", googleApiKeyRoutes);

const webhookRouter = express.Router();
webhookRouter.use(webhookRoutes);

module.exports = {
  apiRouter: router,
  webhookRouter,
  API_PREFIX,
  WEBHOOK_PREFIX,
};

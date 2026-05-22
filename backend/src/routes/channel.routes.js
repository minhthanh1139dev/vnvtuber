const express = require("express");
const channelController = require("../controllers/channel.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/status", channelController.getStatus);
router.get("/live", channelController.listLive);
router.get("/", channelController.listChannels);
router.get("/:channelId/live", channelController.getChannelLive);

router.post("/suggest", channelController.suggestChannel);
router.post("/import", auth, channelController.importChannels);
router.post("/sync", auth, channelController.syncSubscriptions);
router.post("/", auth, channelController.addChannel);

module.exports = router;

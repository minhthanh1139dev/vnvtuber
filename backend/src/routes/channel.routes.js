const express = require("express");
const channelController = require("../controllers/channel.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

// System Status metrics (public or auth)
router.get("/status", channelController.getStatus);
router.get("/vtubers/status", channelController.getStatus); // Frontend standard path alias

// VTuber Directory Discovery (public)
router.get("/vtubers", channelController.getVtubers);
router.get("/vtubers/live", channelController.getLiveVtubers);
router.post("/vtubers/suggest", channelController.suggestChannel);

// Protected Administration endpoints (Requires Bearer JWT)
router.post("/channels", auth, channelController.addChannel);
router.post("/vtubers/add", auth, channelController.addChannel); // Frontend standard path alias

router.post("/channels/import", auth, channelController.importChannels);
router.post("/vtubers/import", auth, channelController.importChannels); // Frontend standard path alias

router.post("/channels/sync", auth, channelController.syncSubscriptions);
router.post("/vtubers/sync-subscriptions", auth, channelController.syncSubscriptions); // Frontend standard path alias

router.post("/vtubers/:channelId/approve", auth, channelController.approveChannel);

module.exports = router;

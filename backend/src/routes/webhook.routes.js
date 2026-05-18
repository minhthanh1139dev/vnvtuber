const express = require("express");
const webhookController = require("../controllers/webhook.controller");

const router = express.Router();

router.get("/webhook", webhookController.verifyWebhook);
router.post("/webhook", webhookController.receiveNotification);

module.exports = router;

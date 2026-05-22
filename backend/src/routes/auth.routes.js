const express = require("express");
const authController = require("../controllers/auth.controller");
const auth = require("../middlewares/auth.middleware");
const { loginRateLimiter } = require("../middlewares/rateLimit.middleware");

const router = express.Router();

router.post("/login", loginRateLimiter, authController.login);
router.post("/change-password", auth, authController.changePassword);

module.exports = router;

"use strict";

const express = require("express");
const googleApiKeyController = require("../controllers/google-api-key.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", auth, googleApiKeyController.list);
router.post("/", auth, googleApiKeyController.create);
router.patch("/:id", auth, googleApiKeyController.update);
router.delete("/:id", auth, googleApiKeyController.remove);

module.exports = router;

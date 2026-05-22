const express = require("express");
const sponsorController = require("../controllers/sponsor.controller");
const auth = require("../middlewares/auth.middleware");

const router = express.Router();

router.get("/", sponsorController.getSponsors);
router.post("/", auth, sponsorController.createSponsor);
router.put("/:id", auth, sponsorController.updateSponsor);

module.exports = router;

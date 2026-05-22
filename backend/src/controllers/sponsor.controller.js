"use strict";

const sponsorRepository = require("../repositories/sponsor.repository");
const logger = require("../utils/logger");
const { OK, CREATED, BAD_REQUEST, NOT_FOUND } = require("../utils/response");
const { wrapController } = require("../utils/asyncHandler");

class SponsorController {
  async getSponsors(req, res) {
    const activeList = await sponsorRepository.findActiveSorted();
    return new OK({ data: activeList }).send(res);
  }

  async createSponsor(req, res) {
    const { title, description, targetUrl, imageUrl, discountCode, type, priceText } = req.body;
    if (!title || !description || !targetUrl || !type) {
      throw new BAD_REQUEST({
        message: "Missing required fields: title, description, targetUrl, type",
      });
    }

    const item = await sponsorRepository.create({
      title,
      description,
      targetUrl,
      imageUrl: imageUrl || "",
      discountCode: discountCode || "",
      type,
      priceText: priceText || "",
      isActive: true,
    });

    logger.info(`[SPONSOR] Created new ${type}: "${title}"`);
    return new CREATED({ message: "Sponsor created", data: item }).send(res);
  }

  async updateSponsor(req, res) {
    const { id } = req.params;
    const updated = await sponsorRepository.findByIdAndUpdate(id, req.body);
    if (!updated) {
      throw new NOT_FOUND({ message: "Sponsor item not found" });
    }

    logger.info(`[SPONSOR] Updated ad item: "${updated.title}"`);
    return new OK({ message: "Sponsor updated", data: updated }).send(res);
  }
}

module.exports = wrapController(new SponsorController());

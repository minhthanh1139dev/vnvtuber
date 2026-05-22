"use strict";

const Sponsor = require("../models/sponsor.model");

class SponsorRepository {
  findActiveSorted() {
    return Sponsor.find({ isActive: true }).sort({ createdAt: 1 }).lean();
  }

  create(data) {
    const item = new Sponsor(data);
    return item.save();
  }

  findByIdAndUpdate(id, update) {
    return Sponsor.findByIdAndUpdate(id, update, { new: true }).lean();
  }
}

module.exports = new SponsorRepository();

"use strict";

const GoogleApiKey = require("../models/google-api-key.model");

const LIST_PROJECTION = "status lastUsedAt lastError requestCount createdAt updatedAt";

class GoogleApiKeyRepository {
  /** Active key with lowest requestCount (load-balanced usage). */
  findLeastUsedActiveWithKey() {
    return GoogleApiKey.findOne({ status: "active" })
      .select(`+key ${LIST_PROJECTION}`)
      .sort({ requestCount: 1, createdAt: 1 })
      .lean();
  }

  findAllForAdmin() {
    return GoogleApiKey.find({})
      .select(`+key ${LIST_PROJECTION}`)
      .sort({ requestCount: 1, createdAt: 1 })
      .lean();
  }

  findById(id) {
    return GoogleApiKey.findById(id).select(`+key ${LIST_PROJECTION}`).lean();
  }

  findByKey(key) {
    return GoogleApiKey.findOne({ key }).select(`+key ${LIST_PROJECTION}`).lean();
  }

  countByStatus(status = "active") {
    return GoogleApiKey.countDocuments({ status });
  }

  create(data) {
    return GoogleApiKey.create(data);
  }

  updateById(id, update) {
    return GoogleApiKey.findByIdAndUpdate(id, update, { new: true })
      .select(LIST_PROJECTION)
      .lean();
  }

  markExhausted(id, lastError = null) {
    return GoogleApiKey.findByIdAndUpdate(
      id,
      {
        status: "exhausted",
        lastError: lastError || "quotaExceeded",
      },
      { new: true }
    )
      .select(LIST_PROJECTION)
      .lean();
  }

  touchUsed(id) {
    return GoogleApiKey.findByIdAndUpdate(
      id,
      {
        $set: { lastUsedAt: new Date(), lastError: null },
        $inc: { requestCount: 1 },
      },
      { new: true }
    )
      .select(LIST_PROJECTION)
      .lean();
  }

  deleteById(id) {
    return GoogleApiKey.findByIdAndDelete(id);
  }
}

module.exports = new GoogleApiKeyRepository();

"use strict";

const mongoose = require("mongoose");

const googleApiKeySchema = new mongoose.Schema(
  {
    /** Google Cloud API key (YouTube Data API v3). Hidden from default queries. */
    key: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      select: false,
    },
    status: {
      type: String,
      enum: ["active", "disabled", "exhausted"],
      default: "active",
      index: true,
    },
    lastUsedAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
    requestCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

googleApiKeySchema.index({ status: 1, requestCount: 1 });

module.exports = mongoose.model("GoogleApiKey", googleApiKeySchema);

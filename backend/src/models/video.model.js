const mongoose = require("mongoose");

const videoSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
      required: true,
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    thumbnail: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["stream", "clip", "premiere", "video"],
      default: "stream",
    },
    liveStatus: {
      type: String,
      enum: ["upcoming", "live", "ended", "none"],
      default: "none",
    },
    visibility: {
      type: String,
      default: "public",
    },
    scheduledStartAt: {
      type: Date,
      default: null,
    },
    actualStartAt: {
      type: Date,
      default: null,
    },
    actualEndAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    viewerCount: {
      type: Number,
      default: 0,
    },
    peakViewerCount: {
      type: Number,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    collabs: {
      type: [
        {
          channelId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Channel",
          },
          name: {
            type: String,
            trim: true,
          },
        },
      ],
      default: [],
    },
    statistics: {
      views: { type: Number, default: 0 },
      likes: { type: Number, default: 0 },
      comments: { type: Number, default: 0 },
    },
    source: {
      platform: { type: String, default: "youtube" },
    },
    processing: {
      webhookReceivedAt: { type: Date, default: null },
      lastPolledAt: { type: Date, default: null },
      consecutiveErrors: { type: Number, default: 0 },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes for ultra-fast query speeds (Holodex vibe)
videoSchema.index({ videoId: 1 }, { unique: true });
videoSchema.index({ liveStatus: 1, actualStartAt: -1 });
videoSchema.index({ scheduledStartAt: 1 });
videoSchema.index({ channelId: 1, actualStartAt: -1 });
videoSchema.index({ organizationId: 1, liveStatus: 1 });

module.exports = mongoose.model("Video", videoSchema);

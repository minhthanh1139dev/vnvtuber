const mongoose = require("mongoose");

const channelSchema = new mongoose.Schema(
  {
    // Natural key matching the YouTube Channel ID (e.g. UC_x5XG1OV...)
    _id: {
      type: String,
      required: true,
      trim: true,
    },
    displayName: {
      type: String,
      trim: true,
      default: "",
    },
    englishName: {
      type: String,
      trim: true,
      default: "",
    },
    avatarUrl: {
      type: String,
      default: "",
    },
    banner: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    organizationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
    },
    type: {
      type: String,
      enum: ["independent", "agency"],
      default: "independent",
    },
    agencyName: {
      type: String,
      default: "",
    },
    branch: {
      type: String,
      default: "", // e.g. "Hololive EN", "VNvtuber Group"
    },
    generation: {
      type: String,
      default: "", // Generation tag
    },
    socials: {
      twitter: { type: String, default: "" },
      twitch: { type: String, default: "" },
    },
    // Embed live/upcoming status inside channels for ultra-fast landing page reads
    status: {
      isLive: {
        type: Boolean,
        default: false,
      },
      currentLiveVideoId: {
        type: String,
        default: null,
      },
      lastLiveAt: {
        type: Date,
        default: null,
      },
    },
    subscriberCount: {
      type: Number,
      default: 0,
    },
    viewCount: {
      type: Number,
      default: 0,
    },
    videoCount: {
      type: Number,
      default: 0,
    },
    isCommunityApproved: {
      type: Boolean,
      default: true,
    },
    parentChannelId: {
      type: String,
      default: null,
    },
    streamFrequencyRank: {
      type: Number,
      default: 0,
    },
    lastActiveAt: {
      type: Date,
      default: null,
    },
    // Google PubSubHubbub subscription details
    subscriptionStatus: {
      type: String,
      enum: ["unsubscribed", "pending", "subscribed", "failed"],
      default: "unsubscribed",
    },
    subscribedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    lastError: {
      type: String,
      default: null,
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

// Indexes (Holodex optimized)
channelSchema.index({ "status.isLive": 1 });
channelSchema.index({ organizationId: 1 });
channelSchema.index({ expiresAt: 1 });
channelSchema.index({ subscriptionStatus: 1 });

module.exports = mongoose.model("Channel", channelSchema);

const mongoose = require("mongoose");

const socialLinkSchema = new mongoose.Schema(
  {
    network: { type: String, required: true, trim: true },
    url: { type: String, required: true, trim: true },
  },
  { _id: false }
);

const channelSchema = new mongoose.Schema(
  {
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
    avatarUrl: {
      type: String,
      default: "",
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      default: null,
    },
    type: {
      type: String,
      enum: ["independent", "agency"],
      default: "independent",
    },
    socials: {
      type: [socialLinkSchema],
      default: [],
    },
    /** Live state — updated by WebSub worker + light polling (no separate Video collection required). */
    status: {
      isLive: {
        type: Boolean,
        default: false,
      },
      currentLiveVideoId: {
        type: String,
        default: null,
      },
      liveTitle: {
        type: String,
        default: "",
      },
      liveThumbnail: {
        type: String,
        default: "",
      },
      livePhase: {
        type: String,
        enum: ["live", "upcoming"],
        default: null,
      },
      scheduledStartAt: {
        type: Date,
        default: null,
      },
      startedAt: {
        type: Date,
        default: null,
      },
      lastLiveAt: {
        type: Date,
        default: null,
      },
      lastPolledAt: {
        type: Date,
        default: null,
      },
      pollErrorCount: {
        type: Number,
        default: 0,
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
    /** null = main channel; UC... = parent when this row is an alt channel */
    parentChannelId: {
      type: String,
      default: null,
    },
    lastScrapeAt: {
      type: Date,
      default: null,
    },
    subscriptionStatus: {
      type: String,
      enum: ["unsubscribed", "pending", "subscribed", "failed"],
      default: "pending",
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

channelSchema.index({ "status.isLive": 1 });
channelSchema.index({ "status.livePhase": 1 });
channelSchema.index({ "status.currentLiveVideoId": 1 });
channelSchema.index({ projectId: 1 });
channelSchema.index({ expiresAt: 1 });
channelSchema.index({ subscriptionStatus: 1 });
channelSchema.index({ lastScrapeAt: 1 });
channelSchema.index({ type: 1 });

module.exports = mongoose.model("Channel", channelSchema);

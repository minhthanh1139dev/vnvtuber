/**
 * Reserved for future viewer charts — disabled (see ENABLE_STREAM_SNAPSHOTS, unused in MVP).
 */
const mongoose = require("mongoose");

const streamSnapshotSchema = new mongoose.Schema(
  {
    videoId: {
      type: String,
      required: true,
      trim: true,
    },
    timestamp: {
      type: Date,
      required: true,
    },
    viewerCount: {
      type: Number,
      required: true,
    },
    likes: {
      type: Number,
      default: 0,
    },
  },
  {
    versionKey: false,
  }
);

// Indexes
streamSnapshotSchema.index({ videoId: 1, timestamp: -1 });

// TTL index to automatically purge hot data snapshots older than 30 days
streamSnapshotSchema.index(
  { timestamp: 1 },
  { expireAfterSeconds: 2592000 } // 30 days in seconds
);

module.exports = mongoose.model("StreamSnapshot", streamSnapshotSchema);

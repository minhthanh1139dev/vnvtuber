"use strict";

/**
 * Reserved for future stream history — MVP uses Channel.status only.
 */
const Video = require("../models/video.model");

const ACTIVE_PROJECTION =
  "videoId channelId title liveStatus actualStartAt scheduledStartAt thumbnail viewerCount processing";
const ENDED_PROJECTION =
  "videoId channelId title liveStatus actualStartAt scheduledStartAt actualEndAt durationSeconds processing";

class VideoRepository {
  findByVideoId(videoId) {
    return Video.findOne({ videoId }).lean();
  }

  findByMongoId(id) {
    return Video.findById(id).lean();
  }

  findByIdAndUpdate(mongoId, update) {
    return Video.findByIdAndUpdate(mongoId, update);
  }

  findOneAndUpdateByVideoId(videoId, update, options = {}) {
    return Video.findOneAndUpdate({ videoId }, update, options);
  }

  findActiveStreams() {
    return Video.find({ liveStatus: { $in: ["upcoming", "live"] } })
      .select(ACTIVE_PROJECTION)
      .lean();
  }

  findActiveStreamsWithChannel() {
    return Video.find({ liveStatus: { $in: ["upcoming", "live"] } })
      .select(ACTIVE_PROJECTION)
      .populate("channelId", "displayName avatarUrl type parentChannelId")
      .sort({ actualStartAt: -1, scheduledStartAt: -1 })
      .lean();
  }

  findActiveStreamsSorted() {
    return Video.find({ liveStatus: { $in: ["upcoming", "live"] } })
      .select(ACTIVE_PROJECTION)
      .sort({ actualStartAt: -1, scheduledStartAt: -1 })
      .lean();
  }

  findRecentEnded(limit = 10) {
    return Video.find({ liveStatus: "ended" })
      .select(ENDED_PROJECTION)
      .sort({ actualEndAt: -1 })
      .limit(limit)
      .lean();
  }
}

module.exports = new VideoRepository();

"use strict";

const Channel = require("../models/channel.model");

const LIST_PROJECTION =
  "displayName avatarUrl subscriberCount viewCount videoCount type parentChannelId socials projectId status createdAt";

const LIVE_PROJECTION =
  "displayName avatarUrl type parentChannelId status";

const LIVE_BOARD_PROJECTION =
  "displayName avatarUrl type parentChannelId status subscriptionStatus";

function applyLeanQuery(query, { select, sort, skip, limit } = {}) {
  if (select) query.select(select);
  if (sort) query.sort(sort);
  if (typeof skip === "number") query.skip(skip);
  if (typeof limit === "number") query.limit(limit);
  return query.lean();
}

class ChannelRepository {
  findById(channelId) {
    return Channel.findById(channelId).lean();
  }

  find(filter, options = {}) {
    return applyLeanQuery(Channel.find(filter), options);
  }

  findByIdAndUpdate(channelId, update, options = {}) {
    return Channel.findByIdAndUpdate(channelId, update, { new: true, ...options }).lean();
  }

  findOneAndUpsert(channelId, data) {
    return Channel.findOneAndUpdate({ _id: channelId }, data, { upsert: true, new: true }).lean();
  }

  bulkWrite(operations) {
    return Channel.bulkWrite(operations);
  }

  countDocuments(filter = {}) {
    return Channel.countDocuments(filter);
  }

  aggregateSubscriptionBreakdown() {
    return Channel.aggregate([
      { $group: { _id: "$subscriptionStatus", count: { $sum: 1 } } },
    ]);
  }

  findExpiringSubscriptions(expiresBefore) {
    return Channel.find({
      $or: [
        { subscriptionStatus: { $ne: "subscribed" } },
        { expiresAt: null },
        { expiresAt: { $lte: expiresBefore } },
      ],
    })
      .select("_id displayName subscriptionStatus")
      .lean();
  }

  findLiveChannels() {
    return Channel.find({ "status.isLive": true })
      .select(LIVE_PROJECTION)
      .sort({ "status.lastLiveAt": -1 })
      .lean();
  }

  findOnLiveBoard() {
    return Channel.find({
      "status.currentLiveVideoId": { $ne: null },
      "status.livePhase": { $in: ["live", "upcoming"] },
    })
      .select(LIVE_BOARD_PROJECTION)
      .sort({ "status.startedAt": -1, "status.scheduledStartAt": -1 })
      .lean();
  }

  findChannelsDueForPoll() {
    return Channel.find({
      "status.currentLiveVideoId": { $ne: null },
      "status.livePhase": { $in: ["live", "upcoming"] },
    })
      .select("_id status")
      .lean();
  }

  findList({ filter, sort, skip, limit }) {
    return applyLeanQuery(Channel.find(filter), {
      select: LIST_PROJECTION,
      sort,
      skip,
      limit,
    });
  }

}

module.exports = new ChannelRepository();

"use strict";

const channelRepository = require("../repositories/channel.repository");
const ytbApiService = require("./ytb-api.service");
const logger = require("../utils/logger");

function toDate(value) {
  return value ? new Date(value) : null;
}

class ChannelService {
  thumbnailFromItem(item, videoId) {
    return (
      item?.snippet?.thumbnails?.high?.url ||
      item?.snippet?.thumbnails?.default?.url ||
      (videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "")
    );
  }

  /** Map YouTube videos.list item → Channel.status fields. */
  statusFromYoutubeItem(item) {
    const videoId = item?.id;
    const phase = item?.snippet?.liveBroadcastContent;

    if (!videoId || !["live", "upcoming"].includes(phase)) {
      return null;
    }

    const startedAt =
      phase === "live"
        ? toDate(item?.liveStreamingDetails?.actualStartTime) || new Date()
        : null;

    return {
      videoId,
      title: item?.snippet?.title || "",
      thumbnail: this.thumbnailFromItem(item, videoId),
      phase,
      scheduledStartAt: toDate(item?.liveStreamingDetails?.scheduledStartTime),
      startedAt,
      isLive: phase === "live",
    };
  }

  async applyActiveBroadcast(channelId, item) {
    const mapped = this.statusFromYoutubeItem(item);
    if (!mapped) {
      return null;
    }

    const update = {
      "status.currentLiveVideoId": mapped.videoId,
      "status.liveTitle": mapped.title,
      "status.liveThumbnail": mapped.thumbnail,
      "status.livePhase": mapped.phase,
      "status.scheduledStartAt": mapped.scheduledStartAt,
      "status.startedAt": mapped.startedAt,
      "status.isLive": mapped.isLive,
      "status.lastPolledAt": new Date(),
      "status.pollErrorCount": 0,
      ...(mapped.isLive ? { "status.lastLiveAt": mapped.startedAt || new Date() } : {}),
    };

    await channelRepository.findByIdAndUpdate(channelId, update);
    return mapped;
  }

  async clearBroadcast(channelId, endedAt = new Date()) {
    await channelRepository.findByIdAndUpdate(channelId, {
      "status.isLive": false,
      "status.currentLiveVideoId": null,
      "status.liveTitle": "",
      "status.liveThumbnail": "",
      "status.livePhase": null,
      "status.scheduledStartAt": null,
      "status.startedAt": null,
      "status.lastLiveAt": endedAt,
      "status.lastPolledAt": new Date(),
      "status.pollErrorCount": 0,
    });
  }

  async applyScrapeLive(channelId, videoId) {
    const now = new Date();
    await channelRepository.findByIdAndUpdate(channelId, {
      "status.currentLiveVideoId": videoId,
      "status.liveTitle": "Live stream",
      "status.liveThumbnail": `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      "status.livePhase": "live",
      "status.scheduledStartAt": null,
      "status.startedAt": now,
      "status.isLive": true,
      "status.lastLiveAt": now,
      "status.lastPolledAt": now,
      "status.pollErrorCount": 0,
    });
  }

  async touchPollError(channelId, currentCount = 0) {
    const next = currentCount + 1;
    await channelRepository.findByIdAndUpdate(channelId, {
      "status.lastPolledAt": new Date(),
      "status.pollErrorCount": next,
    });
    return next;
  }

  mapChannelToLiveRow(channel) {
    const videoId = channel.status?.currentLiveVideoId;
    if (!videoId) return null;

    const phase = channel.status?.livePhase;
    if (phase !== "live" && phase !== "upcoming" && !channel.status?.isLive) {
      return null;
    }

    return {
      videoId,
      channelId: channel._id,
      title: channel.status?.liveTitle || "",
      status: phase || (channel.status?.isLive ? "live" : "none"),
      startedAt: (
        channel.status?.startedAt ||
        channel.status?.scheduledStartAt ||
        channel.status?.lastLiveAt ||
        new Date()
      ).toISOString(),
      thumbnail:
        channel.status?.liveThumbnail || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      scheduledStartAt: channel.status?.scheduledStartAt
        ? channel.status.scheduledStartAt.toISOString()
        : null,
      actualStartAt: channel.status?.startedAt
        ? channel.status.startedAt.toISOString()
        : null,
      channel: {
        displayName: channel.displayName,
        avatarUrl: channel.avatarUrl,
        type: channel.type,
        parentChannelId: channel.parentChannelId,
      },
    };
  }

  mapChannelToLiveDetail(channel) {
    const row = this.mapChannelToLiveRow(channel);
    if (!row) return null;
    return {
      videoId: row.videoId,
      title: row.title,
      status: row.status,
      thumbnail: row.thumbnail,
      startedAt: row.actualStartAt || row.scheduledStartAt || row.startedAt,
    };
  }

  async syncChannelActiveStreams(channelId) {
    const items = await ytbApiService.getChannelRecentBroadcasts(channelId);

    let currentLive = null;
    let liveCount = 0;
    let upcomingCount = 0;

    for (const item of items) {
      const mapped = this.statusFromYoutubeItem(item);
      if (!mapped) continue;

      if (mapped.phase === "live") {
        liveCount += 1;
        if (!currentLive) currentLive = mapped;
      } else if (mapped.phase === "upcoming") {
        upcomingCount += 1;
        if (!currentLive) currentLive = mapped;
      }
    }

    if (currentLive) {
      const fullItem = items.find((i) => i.id === currentLive.videoId);
      if (fullItem) {
        await this.applyActiveBroadcast(channelId, fullItem);
      }
    } else {
      await this.clearBroadcast(channelId);
    }

    logger.info(
      `[CHANNEL SYNC] ${channelId}: live=${liveCount} upcoming=${upcomingCount} current=${currentLive?.videoId || "none"}`
    );

    return {
      totalActive: liveCount + upcomingCount,
      liveCount,
      upcomingCount,
      currentLiveVideoId: currentLive?.videoId || null,
    };
  }
}

module.exports = new ChannelService();

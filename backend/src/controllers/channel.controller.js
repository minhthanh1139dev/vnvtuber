"use strict";

const channelRepository = require("../repositories/channel.repository");
const googleApiKeyService = require("../services/google-api-key.service");
const queueManager = require("../queue");
const channelService = require("../services/channel.service");
const ytbApiService = require("../services/ytb-api.service");
const channelScheduler = require("../scheduler/channel.scheduler");
const logger = require("../utils/logger");
const {
  buildPaginator,
  buildPaginationMeta,
} = require("../utils/queryOptions");
const {
  OK,
  BAD_REQUEST,
  NOT_FOUND,
  SERVICE_UNAVAILABLE,
} = require("../utils/response");
const { wrapController } = require("../utils/asyncHandler");

const LIST_PROJECTION =
  "displayName avatarUrl subscriberCount viewCount videoCount type parentChannelId socials organizationId status createdAt";

function mapChannelListItem(v) {
  return {
    channelId: v._id,
    displayName: v.displayName,
    avatarUrl: v.avatarUrl,
    type: v.type,
    parentChannelId: v.parentChannelId,
    socials: v.socials || [],
    organizationId: v.organizationId,
    status: v.status,
    subscriberCount: v.subscriberCount,
    viewCount: v.viewCount,
    videoCount: v.videoCount,
    createdAt: v.createdAt ? new Date(v.createdAt).toISOString() : null,
  };
}

function seededShuffle(items, seedStr) {
  let hash = 0;
  for (let i = 0; i < seedStr.length; i++) {
    hash = seedStr.charCodeAt(i) + ((hash << 5) - hash);
  }
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    hash = (hash * 9301 + 49297) % 233280;
    const j = hash % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function fetchChannelDetailsOptional(channelId) {
  try {
    return await ytbApiService.getChannelDetails(channelId);
  } catch (err) {
    logger.warn(
      `Could not fetch details for channel ${channelId} from YouTube API: ${err.message}`,
    );
    return null;
  }
}

async function fetchChannelBatchOptional(batchIds) {
  try {
    return await ytbApiService.getChannelDetails(batchIds);
  } catch (err) {
    logger.warn(
      `Could not fetch details for batch starting with ${batchIds[0]} from YouTube API: ${err.message}`,
    );
    return [];
  }
}

async function syncChannelStreamsOptional(channelId) {
  try {
    return await channelService.syncChannelActiveStreams(channelId);
  } catch (err) {
    logger.warn(
      `[CONTROLLER] Initial sync failed for ${channelId}: ${err.message}`,
    );
    return null;
  }
}

class ChannelController {
  async getStatus(req, res) {
    const breakdown = await channelRepository.aggregateSubscriptionBreakdown();

    const stats = {
      totalChannels: await channelRepository.countDocuments(),
      subscriptionBreakdown: breakdown.reduce((acc, curr) => {
        acc[curr._id] = curr.count;
        return acc;
      }, {}),
    };

    const activeChannels = await channelRepository.findOnLiveBoard();

    return new OK({
      data: {
        serviceStatus: "online",
        stats,
        activeStreams: activeChannels.map((ch) => ({
          videoId: ch.status?.currentLiveVideoId,
          channelId: ch._id,
          title: ch.status?.liveTitle || "",
          status: ch.status?.livePhase || (ch.status?.isLive ? "live" : "none"),
          startedAt: (
            ch.status?.startedAt ||
            ch.status?.scheduledStartAt ||
            new Date()
          ).toISOString(),
          lastPolledAt: ch.status?.lastPolledAt
            ? ch.status.lastPolledAt.toISOString()
            : "Never",
          errors: ch.status?.pollErrorCount || 0,
        })),
        recentHistory: [],
      },
    }).send(res);
  }

  async addChannel(req, res) {
    const { channelId, displayName, type, parentChannelId, socials } = req.body;
    if (!channelId) {
      throw new BAD_REQUEST({ message: "channelId is required" });
    }

    let avatarUrl = "";
    let subscriberCount = 0;
    let viewCount = 0;
    let videoCount = 0;
    let finalDisplayName = displayName || "";

    const item = await fetchChannelDetailsOptional(channelId);
    if (item) {
      finalDisplayName = finalDisplayName || item.snippet.title || "";
      avatarUrl =
        item.snippet.thumbnails?.high?.url ||
        item.snippet.thumbnails?.default?.url ||
        "";
      subscriberCount = parseInt(item.statistics?.subscriberCount, 10) || 0;
      viewCount = parseInt(item.statistics?.viewCount, 10) || 0;
      videoCount = parseInt(item.statistics?.videoCount, 10) || 0;
    }

    await channelRepository.findOneAndUpsert(channelId, {
      displayName: finalDisplayName,
      avatarUrl,
      subscriberCount,
      viewCount,
      videoCount,
      type: type || "independent",
      parentChannelId: parentChannelId || null,
      socials: Array.isArray(socials) ? socials : [],
      subscriptionStatus: "pending",
    });

    logger.info(
      `[CONTROLLER] Registered channel: ${channelId} ("${finalDisplayName}")`,
    );
    await queueManager.queueSubscriptionJob(channelId, "subscribe");

    const syncSummary = await syncChannelStreamsOptional(channelId);

    return new OK({
      message: `Registered channel ${channelId}, queued WebSub subscription, and synced current broadcasts.`,
      data: { syncSummary },
    }).send(res);
  }

  async importChannels(req, res) {
    const { channels } = req.body;
    if (!Array.isArray(channels)) {
      throw new BAD_REQUEST({ message: "channels must be an array" });
    }

    logger.info(`[CONTROLLER] Bulk importing ${channels.length} channels...`);
    let addedCount = 0;

    const validChannels = channels.filter(
      (c) => c.channelId && c.channelId.startsWith("UC"),
    );
    const channelIds = validChannels.map((c) => c.channelId);

    const itemsMap = new Map();
    const batchSize = 50;
    for (let i = 0; i < channelIds.length; i += batchSize) {
      const batchIds = channelIds.slice(i, i + batchSize);
      const items = await fetchChannelBatchOptional(batchIds);
      for (const batchItem of items) {
        itemsMap.set(batchItem.id, batchItem);
      }
    }

    const bulkOps = validChannels.map((c) => {
      const row = itemsMap.get(c.channelId);
      const finalDisplayName = c.displayName || row?.snippet?.title || "";
      const avatarUrl =
        row?.snippet?.thumbnails?.high?.url ||
        row?.snippet?.thumbnails?.default?.url ||
        "";
      const subscriberCount =
        parseInt(row?.statistics?.subscriberCount, 10) || 0;
      const viewCount = parseInt(row?.statistics?.viewCount, 10) || 0;
      const videoCount = parseInt(row?.statistics?.videoCount, 10) || 0;

      return {
        updateOne: {
          filter: { _id: c.channelId },
          update: {
            $set: {
              displayName: finalDisplayName,
              avatarUrl,
              subscriberCount,
              viewCount,
              videoCount,
              type: c.type || "independent",
              parentChannelId: c.parentChannelId || null,
              socials: Array.isArray(c.socials) ? c.socials : [],
              subscriptionStatus: "pending",
            },
          },
          upsert: true,
        },
      };
    });

    if (bulkOps.length > 0) {
      const result = await channelRepository.bulkWrite(bulkOps);
      addedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);

      for (const op of bulkOps) {
        await queueManager.queueSubscriptionJob(
          op.updateOne.filter._id,
          "subscribe",
        );
        await syncChannelStreamsOptional(op.updateOne.filter._id);
      }
    }

    return new OK({
      message: `Imported ${addedCount}/${channels.length} channels and queued subscription tasks.`,
      data: { imported: addedCount, total: channels.length },
    }).send(res);
  }

  async syncSubscriptions(req, res) {
    logger.info("[CONTROLLER] Manual subscription sync triggered.");
    channelScheduler.checkAndRenewSubscriptions();
    return new OK({
      message: "Subscription scan triggered successfully.",
    }).send(res);
  }

  async listChannels(req, res) {
    const { type, q, sort } = req.query;
    const { page, limit, skip } = buildPaginator(req.query);
    const query = {};

    if (type) query.type = type;
    if (q) query.displayName = new RegExp(q, "i");
    if (sort === "new") query.videoCount = { $lt: 100 };

    const total = await channelRepository.countDocuments(query);
    let list = [];

    if (sort === "random") {
      const idRows = await channelRepository.find(query, { select: "_id" });
      const todayStr = new Date().toISOString().split("T")[0];
      const shuffled = seededShuffle(idRows, todayStr);
      const pageSlice = shuffled.slice(skip, skip + limit);
      const pageIds = pageSlice.map((row) => row._id);

      if (pageIds.length > 0) {
        const channelRows = await channelRepository.find(
          { _id: { $in: pageIds } },
          { select: LIST_PROJECTION },
        );
        const byId = new Map(channelRows.map((c) => [c._id, c]));
        list = pageIds
          .map((id) => byId.get(id))
          .filter(Boolean)
          .map(mapChannelListItem);
      }
    } else {
      let dbSort = { createdAt: -1 };
      if (sort === "popular") dbSort = { subscriberCount: -1 };

      const channelRows = await channelRepository.findList({
        filter: query,
        sort: dbSort,
        skip,
        limit,
      });
      list = channelRows.map(mapChannelListItem);
    }

    return new OK({
      data: list,
      meta: buildPaginationMeta({ page, limit, total }),
    }).send(res);
  }

  async getChannelLive(req, res) {
    const { channelId } = req.params;
    const refresh = req.query.refresh === "true";

    if (!channelId || !channelId.startsWith("UC")) {
      throw new BAD_REQUEST({
        message: "Valid YouTube channelId (UC...) is required.",
      });
    }

    let channel = await channelRepository.findById(channelId);
    if (!channel) {
      throw new NOT_FOUND({
        message: "Channel not registered. Add it via POST /api/channels first.",
      });
    }

    if (refresh && googleApiKeyService.hasActiveKeys()) {
      const refreshLiveItem =
        await ytbApiService.getChannelLiveVideo(channelId);
      const liveVideoId = refreshLiveItem?.id?.videoId;

      if (liveVideoId) {
        const item = await ytbApiService.getVideoDetails(liveVideoId);
        if (item) {
          await channelService.applyActiveBroadcast(channelId, item);
        } else {
          await channelService.applyScrapeLive(channelId, liveVideoId);
        }
      } else {
        await channelService.clearBroadcast(channelId);
      }

      channel = await channelRepository.findById(channelId);
    } else if (refresh) {
      throw new SERVICE_UNAVAILABLE({
        message: "Cannot refresh: no active Google API keys in database.",
      });
    }

    const liveVideo = channelService.mapChannelToLiveDetail(channel);

    return new OK({
      data: {
        channelId: channel._id,
        displayName: channel.displayName,
        avatarUrl: channel.avatarUrl,
        type: channel.type,
        parentChannelId: channel.parentChannelId,
        socials: channel.socials || [],
        isLive: Boolean(channel.status?.isLive),
        subscriptionStatus: channel.subscriptionStatus,
        subscribedAt: channel.subscribedAt,
        expiresAt: channel.expiresAt,
        live: liveVideo,
      },
    }).send(res);
  }

  async listLive(req, res) {
    const channels = await channelRepository.findOnLiveBoard();
    const list = channels
      .map(channelService.mapChannelToLiveRow)
      .filter(Boolean);
    return new OK({ data: list }).send(res);
  }

  async suggestChannel(req, res) {
    return this.addChannel(req, res);
  }
}

module.exports = wrapController(new ChannelController());

const Channel = require("../models/channel.model");
const Video = require("../models/video.model");
const queueManager = require("../queue");
const schedulerService = require("../services/scheduler.service");
const youtubeService = require("../services/youtube.service");
const logger = require("../utils/logger");

module.exports = {
  /**
   * Retrieves overall tracking status, subscription metrics, ongoing poll lists, and recent history.
   */
  async getStatus(req, res) {
    try {
      // 1. Get channel subscription stats using MongoDB aggregation
      const breakdown = await Channel.aggregate([
        {
          $group: {
            _id: "$subscriptionStatus",
            count: { $sum: 1 },
          },
        },
      ]);

      const stats = {
        totalChannels: await Channel.countDocuments(),
        subscriptionBreakdown: breakdown.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
      };

      // 2. Get active streams (Consolidated Video collection)
      const active = await Video.find({ liveStatus: { $in: ["upcoming", "live"] } }).sort({ actualStartAt: -1, scheduledStartAt: -1 });

      // 3. Get recent stream history
      const history = await Video.find({ liveStatus: "ended" }).sort({ actualEndAt: -1 }).limit(10);

      res.json({
        status: "online",
        stats,
        activeStreams: active.map((s) => ({
          videoId: s.videoId,
          channelId: s.channelId,
          title: s.title,
          status: s.liveStatus,
          startedAt: (s.actualStartAt || s.scheduledStartAt || new Date()).toISOString(),
          lastPolledAt: s.processing?.lastPolledAt ? s.processing.lastPolledAt.toISOString() : "Never",
          errors: s.processing?.consecutiveErrors || 0,
        })),
        recentHistory: history.map((h) => ({
          videoId: h.videoId,
          channelId: h.channelId,
          title: h.title,
          startedAt: (h.actualStartAt || h.scheduledStartAt || new Date()).toISOString(),
          endedAt: h.actualEndAt ? h.actualEndAt.toISOString() : new Date().toISOString(),
          durationSeconds: h.durationSeconds,
        })),
      });
    } catch (err) {
      logger.error("Error retrieving system status stats:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Registers a single YouTube Channel and schedules its WebSub subscription.
   */
  async addChannel(req, res) {
    const { channelId, displayName, type, agencyName, parentChannelId, isSuggestion } = req.body;
    if (!channelId) {
      return res.status(400).json({ error: "channelId is required" });
    }

    try {
      let avatarUrl = "";
      let description = "";
      let subscriberCount = 0;
      let viewCount = 0;
      let videoCount = 0;
      let finalDisplayName = displayName || "";

      try {
        const item = await youtubeService.getChannelDetails(channelId);
        if (item) {
          finalDisplayName = finalDisplayName || item.snippet.title || "";
          avatarUrl = item.snippet.thumbnails?.high?.url || item.snippet.thumbnails?.default?.url || "";
          description = item.snippet.description || "";
          subscriberCount = parseInt(item.statistics?.subscriberCount, 10) || 0;
          viewCount = parseInt(item.statistics?.viewCount, 10) || 0;
          videoCount = parseInt(item.statistics?.videoCount, 10) || 0;
        }
      } catch (err) {
        logger.warn(`Could not fetch details for channel ${channelId} from YouTube API: ${err.message}`);
      }

      const updateData = {
        displayName: finalDisplayName,
        avatarUrl,
        description,
        subscriberCount,
        viewCount,
        videoCount,
        type: type || "independent",
        agencyName: agencyName || "",
        parentChannelId: parentChannelId || null,
        isCommunityApproved: isSuggestion ? false : true,
      };

      // Upsert the channel
      await Channel.findOneAndUpdate(
        { _id: channelId },
        updateData,
        { upsert: true, new: true }
      );

      logger.info(`[CONTROLLER] Registered channel: ${channelId} ("${finalDisplayName}")`);

      // Queue WebSub task in BullMQ
      await queueManager.queueSubscriptionJob(channelId, "subscribe");

      res.json({
        message: isSuggestion 
          ? `Successfully suggested channel ${channelId} for community approval.` 
          : `Successfully registered channel ${channelId} and queued WebSub subscription.`,
      });
    } catch (err) {
      logger.error(`Failed to register channel ${channelId}:`, err);
      res.status(500).json({ error: "Failed to write channel to database." });
    }
  },

  /**
   * Performs bulk import of multiple channels, queueing subscription tasks for all.
   */
  async importChannels(req, res) {
    const { channels } = req.body; // Expect array of { channelId, displayName, type, agencyName }
    if (!Array.isArray(channels)) {
      return res.status(400).json({ error: "channels must be an array" });
    }

    logger.info(`[CONTROLLER] Bulk importing ${channels.length} channels...`);
    let addedCount = 0;

    try {
      const validChannels = channels.filter((c) => c.channelId && c.channelId.startsWith("UC"));
      const channelIds = validChannels.map((c) => c.channelId);

      // Fetch channel details in batches of 50
      const itemsMap = new Map();
      const batchSize = 50;
      for (let i = 0; i < channelIds.length; i += batchSize) {
        const batchIds = channelIds.slice(i, i + batchSize);
        try {
          const items = await youtubeService.getChannelDetails(batchIds);
          for (const item of items) {
            itemsMap.set(item.id, item);
          }
        } catch (err) {
          logger.warn(`Could not fetch details for batch starting with ${batchIds[0]} from YouTube API: ${err.message}`);
        }
      }

      const bulkOps = validChannels.map((c) => {
        const item = itemsMap.get(c.channelId);
        
        const finalDisplayName = c.displayName || item?.snippet?.title || "";
        const avatarUrl = item?.snippet?.thumbnails?.high?.url || item?.snippet?.thumbnails?.default?.url || "";
        const description = item?.snippet?.description || "";
        const subscriberCount = parseInt(item?.statistics?.subscriberCount, 10) || 0;
        const viewCount = parseInt(item?.statistics?.viewCount, 10) || 0;
        const videoCount = parseInt(item?.statistics?.videoCount, 10) || 0;

        return {
          updateOne: {
            filter: { _id: c.channelId },
            update: {
              $set: {
                displayName: finalDisplayName,
                avatarUrl,
                description,
                subscriberCount,
                viewCount,
                videoCount,
                type: c.type || "independent",
                agencyName: c.agencyName || "",
                parentChannelId: c.parentChannelId || null,
                isCommunityApproved: true,
              },
            },
            upsert: true,
          },
        };
      });

      if (bulkOps.length > 0) {
        const result = await Channel.bulkWrite(bulkOps);
        addedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);

        // Queue subscription jobs
        for (const op of bulkOps) {
          const channelId = op.updateOne.filter._id;
          await queueManager.queueSubscriptionJob(channelId, "subscribe");
        }
      }

      res.json({
        message: `Imported ${addedCount}/${channels.length} channels and queued subscription tasks.`,
      });
    } catch (err) {
      logger.error("Failed to perform bulk channel import:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Manually sweeps database to find expired or failed subscriptions and triggers auto-renewals.
   */
  async syncSubscriptions(req, res) {
    logger.info("[CONTROLLER] Manual subscription sync triggered.");
    
    // Asynchronously scan, respond immediately
    schedulerService.checkAndRenewSubscriptions();
    
    res.json({ message: "Subscription scan triggered successfully." });
  },

  /**
   * Retrieves all approved VTubers with advanced filters and daily random sorting.
   */
  async getVtubers(req, res) {
    try {
      const { type, agencyName, q, sort } = req.query;
      const query = { isCommunityApproved: true };

      if (type) query.type = type;
      if (agencyName) query.agencyName = new RegExp(agencyName, "i");
      if (q) query.displayName = new RegExp(q, "i");

      let vtubers = await Channel.find(query);

      // Handle custom sorting
      if (sort === "new") {
        // New channels: videoCount < 100, sorted by creation
        vtubers = vtubers.filter(v => v.videoCount < 100);
        vtubers.sort((a, b) => b.createdAt - a.createdAt);
      } else if (sort === "popular") {
        vtubers.sort((a, b) => b.subscriberCount - a.subscriberCount);
      } else if (sort === "frequency") {
        vtubers.sort((a, b) => b.streamFrequencyRank - a.streamFrequencyRank);
      } else {
        // Default: Seeded daily random shuffle
        const todayStr = new Date().toISOString().split("T")[0]; // "YYYY-MM-DD"
        
        // Simple hash function for seed
        let hash = 0;
        for (let i = 0; i < todayStr.length; i++) {
          hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        function random() {
          const x = Math.sin(hash++) * 10000;
          return x - Math.floor(x);
        }

        // Fisher-Yates shuffle with seeded random
        for (let i = vtubers.length - 1; i > 0; i--) {
          const j = Math.floor(random() * (i + 1));
          [vtubers[i], vtubers[j]] = [vtubers[j], vtubers[i]];
        }
      }

      res.json(vtubers.map(v => ({
        channelId: v._id,
        displayName: v.displayName,
        avatarUrl: v.avatarUrl,
        description: v.description,
        subscriberCount: v.subscriberCount,
        viewCount: v.viewCount,
        videoCount: v.videoCount,
        type: v.type,
        agencyName: v.agencyName,
        parentChannelId: v.parentChannelId,
        streamFrequencyRank: v.streamFrequencyRank,
        lastActiveAt: v.lastActiveAt ? v.lastActiveAt.toISOString() : null,
        createdAt: v.createdAt.toISOString()
      })));
    } catch (err) {
      logger.error("Error retrieving VTubers list:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Retrieves active livestream details, enriched with VTuber channel metadata.
   */
  async getLiveVtubers(req, res) {
    try {
      // Find active streams, populating the Channel metadata directly
      const active = await Video.find({ liveStatus: { $in: ["upcoming", "live"] } })
        .populate("channelId")
        .sort({ actualStartAt: -1, scheduledStartAt: -1 });

      res.json(active.map(s => {
        const channel = s.channelId;
        return {
          videoId: s.videoId,
          channelId: channel ? channel._id : s.channelId,
          title: s.title,
          status: s.liveStatus,
          startedAt: (s.actualStartAt || s.scheduledStartAt || new Date()).toISOString(),
          channel: channel ? {
            displayName: channel.displayName,
            avatarUrl: channel.avatarUrl,
            subscriberCount: channel.subscriberCount,
            type: channel.type,
            agencyName: channel.agencyName
          } : null
        };
      }));
    } catch (err) {
      logger.error("Error retrieving active livestreaming VTubers:", err);
      res.status(500).json({ error: err.message });
    }
  },

  /**
   * Allows community suggestions for VTubers (sets isCommunityApproved = false).
   */
  async suggestChannel(req, res) {
    req.body.isSuggestion = true;
    return module.exports.addChannel(req, res);
  },

  /**
   * Admin approves a suggested VTuber channel.
   */
  async approveChannel(req, res) {
    try {
      const { channelId } = req.params;
      const channel = await Channel.findByIdAndUpdate(
        channelId,
        { isCommunityApproved: true },
        { new: true }
      );

      if (!channel) {
        return res.status(404).json({ error: "Suggested channel not found" });
      }

      logger.info(`[CONTROLLER] Approved suggested channel: ${channelId} ("${channel.displayName}")`);
      res.json({ message: `Successfully approved channel ${channel.displayName}` });
    } catch (err) {
      logger.error(`Error approving channel ${req.params.channelId}:`, err);
      res.status(500).json({ error: err.message });
    }
  },
};

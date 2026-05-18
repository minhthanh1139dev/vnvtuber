const Video = require("../models/video.model");
const Channel = require("../models/channel.model");
const StreamSnapshot = require("../models/stream-snapshot.model");
const youtubeService = require("./youtube.service");
const notifierService = require("./notifier.service");
const config = require("../config");
const logger = require("../utils/logger");

let isRunning = false;
let pollingTimeout = null;

async function pollActiveStreams() {
  if (isRunning) return;
  isRunning = true;

  try {
    // Find all trackable upcoming or live streams (Consolidated Video collection)
    const activeVideos = await Video.find({ liveStatus: { $in: ["upcoming", "live"] } });
    if (activeVideos.length === 0) {
      logger.debug("No active videos/streams to poll in MongoDB.");
      isRunning = false;
      return;
    }

    const now = new Date();
    const videosDue = activeVideos.filter((video) => {
      const intervalMs =
        video.liveStatus === "upcoming"
          ? config.polling.upcomingIntervalMs
          : config.polling.liveIntervalMs;

      // Check if it is due for polling checks
      const elapsedMs = video.processing.lastPolledAt
        ? now.getTime() - video.processing.lastPolledAt.getTime()
        : intervalMs;

      return elapsedMs >= intervalMs;
    });

    if (videosDue.length === 0) {
      logger.debug("No active streams are currently due for polling.");
      isRunning = false;
      return;
    }

    logger.info(
      `Checking polling status for ${videosDue.length} stream(s) due for check (Batching enabled)...`
    );

    const batchSize = 50;
    for (let i = 0; i < videosDue.length; i += batchSize) {
      const batch = videosDue.slice(i, i + batchSize);
      const videoIds = batch.map((v) => v.videoId);

      logger.info(`[POLL BATCH] Querying YouTube status for ${videoIds.length} video(s)`);

      try {
        const items = await youtubeService.getBatchVideoDetails(videoIds);

        // Map items by videoId for rapid access
        const itemsMap = new Map();
        for (const item of items) {
          itemsMap.set(item.id, item);
        }

        for (const videoDoc of batch) {
          const videoId = videoDoc.videoId;
          const { channelId, title, liveStatus, actualStartAt, scheduledStartAt } = videoDoc;
          const item = itemsMap.get(videoId);

          if (!item) {
            logger.warn(
              `[POLL NOT FOUND] Video ${videoId} is missing from YouTube response. Incrementing error count.`
            );
            await handlePollError(videoDoc);
            continue;
          }

          const currentLiveStatus = item.snippet.liveBroadcastContent; // 'none', 'upcoming', 'live'
          const actualEndTimeStr = item.liveStreamingDetails?.actualEndTime;

          logger.debug(
            `[POLL RESULT] video=${videoId} currentStatus=${currentLiveStatus} actualEndTime=${actualEndTimeStr}`
          );

          // Update last polled timestamp and reset errors
          await Video.findByIdAndUpdate(videoDoc._id, {
            "processing.lastPolledAt": new Date(),
            "processing.consecutiveErrors": 0,
          });

          // Case 1: Stream ended
          if (currentLiveStatus === "none" || actualEndTimeStr) {
            const endedAt = actualEndTimeStr ? new Date(actualEndTimeStr) : new Date();
            const startAnchor = actualStartAt || scheduledStartAt || new Date();
            const durationSeconds = Math.max(
              0,
              Math.floor((endedAt.getTime() - startAnchor.getTime()) / 1000)
            );

            logger.info(`[STREAM DETECTED ENDED] video=${videoId} duration=${durationSeconds}s`);

            // Consolidated Video status update to ended
            await Video.findByIdAndUpdate(videoDoc._id, {
              liveStatus: "ended",
              actualEndAt: endedAt,
              durationSeconds,
              "statistics.views": item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : 0,
              "statistics.likes": item.statistics?.likeCount ? parseInt(item.statistics.likeCount, 10) : 0,
            });

            // DENORMALIZATION OPTIMIZATION: Update Channel status to inactive live
            await Channel.findByIdAndUpdate(channelId, {
              "status.isLive": false,
              "status.currentLiveVideoId": null,
              "status.lastLiveAt": endedAt,
              lastActiveAt: endedAt,
            });

            // Notify endpoints
            await notifierService.notifyStreamEnded(
              videoId,
              channelId,
              title,
              startAnchor,
              endedAt,
              durationSeconds,
              item
            );
          }
          // Case 2: Transitioned from upcoming to live
          else if (liveStatus === "upcoming" && currentLiveStatus === "live") {
            logger.info(`[POLL TRANSITION] video=${videoId} transitioned from UPCOMING to LIVE.`);

            const liveStartedAt = item.liveStreamingDetails?.actualStartTime
              ? new Date(item.liveStreamingDetails.actualStartTime)
              : new Date();

            await Video.findByIdAndUpdate(videoDoc._id, {
              liveStatus: "live",
              actualStartAt: liveStartedAt,
            });

            // DENORMALIZATION OPTIMIZATION: Sync Channel live status
            await Channel.findByIdAndUpdate(channelId, {
              "status.isLive": true,
              "status.currentLiveVideoId": videoId,
              "status.lastLiveAt": liveStartedAt,
            });

            await notifierService.notifyStreamStarted(videoId, channelId, title, item);
          }
          // Case 3: Still actively live -> record viewer count snapshot
          else if (liveStatus === "live" && currentLiveStatus === "live") {
            const currentViewers = item.liveStreamingDetails?.concurrentViewers
              ? parseInt(item.liveStreamingDetails.concurrentViewers, 10)
              : 0;
            const currentLikes = item.statistics?.likeCount
              ? parseInt(item.statistics.likeCount, 10)
              : 0;

            await Video.findByIdAndUpdate(videoDoc._id, {
              viewerCount: currentViewers,
              $max: { peakViewerCount: currentViewers },
              "statistics.likes": currentLikes,
              "statistics.views": item.statistics?.viewCount ? parseInt(item.statistics.viewCount, 10) : 0,
            });

            // Periodic snapshot logger (TTL Auto-Purges in 30 days)
            await StreamSnapshot.create({
              videoId: videoDoc._id,
              timestamp: new Date(),
              viewerCount: currentViewers,
              likes: currentLikes,
            });
          }
          // Case 4: Other mismatches, simply align status
          else if (currentLiveStatus !== liveStatus) {
            await Video.findByIdAndUpdate(videoDoc._id, { liveStatus: currentLiveStatus });
          }
        }
      } catch (err) {
        logger.error(`Error polling batch starting with ${videoIds[0]}:`, err.message);
        for (const videoDoc of batch) {
          await handlePollError(videoDoc);
        }
      }

      // 500ms delay to spread API hits between batches
      if (i + batchSize < videosDue.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }
  } catch (error) {
    logger.error("Error in active streams polling loop:", error);
  } finally {
    isRunning = false;
  }
}

async function handlePollError(videoDoc) {
  const { _id: docId, videoId, channelId, title, scheduledStartAt, actualStartAt } = videoDoc;
  const consecutiveErrors = videoDoc.processing?.consecutiveErrors || 0;
  const nextErrors = consecutiveErrors + 1;

  await Video.findByIdAndUpdate(docId, { $inc: { "processing.consecutiveErrors": 1 } });

  if (nextErrors >= 5) {
    logger.error(`[POLL CLEANUP] Video ${videoId} failed 5 consecutive polls. Removing from tracking.`);

    const endedAt = new Date();
    const startAnchor = actualStartAt || scheduledStartAt || new Date();
    const durationSeconds = Math.max(0, Math.floor((endedAt.getTime() - startAnchor.getTime()) / 1000));

    await Video.findByIdAndUpdate(docId, {
      liveStatus: "ended",
      actualEndAt: endedAt,
      durationSeconds,
    });

    // Sync Channel status to offline
    await Channel.findByIdAndUpdate(channelId, {
      "status.isLive": false,
      "status.currentLiveVideoId": null,
      "status.lastLiveAt": endedAt,
      lastActiveAt: endedAt,
    });

    await notifierService.notifyStreamEnded(
      videoId,
      channelId,
      title,
      startAnchor,
      endedAt,
      durationSeconds,
      { error: "Consistently failed polls" }
    );
  }
}

function start() {
  logger.info("Starting Mongoose Consolidated Livestream Polling Engine...");
  const tick = async () => {
    await pollActiveStreams();
    pollingTimeout = setTimeout(tick, 30000);
  };
  tick();
}

function stop() {
  logger.info("Stopping Mongoose Consolidated Livestream Polling Engine...");
  if (pollingTimeout) {
    clearTimeout(pollingTimeout);
  }
}

module.exports = {
  start,
  stop,
};

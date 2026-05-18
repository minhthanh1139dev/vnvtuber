const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const connectDb = require("../src/db");
const Channel = require("../src/models/channel.model");
const queueManager = require("../src/queue");
const logger = require("../src/utils/logger");

// Load background workers & configurations
require("dotenv").config();

async function importChannels() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log(`
Usage:
  node scripts/import-channels.js <path-to-json-file>

JSON File Format Example:
[
  { "channelId": "UC_x5XG1OV2P6uZZ5FSM9Ttw", "displayName": "Chime VTuber" },
  { "channelId": "UCp6o9cttA2u85OPZuaG1t8g", "displayName": "Gawr Gura Ch." }
]
    `);
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  if (!fs.existsSync(filePath)) {
    logger.error(`Error: File not found at ${filePath}`);
    process.exit(1);
  }

  logger.info(`Reading channels from ${filePath}...`);
  let channelsData;
  try {
    const rawContent = fs.readFileSync(filePath, "utf-8");
    channelsData = JSON.parse(rawContent);
  } catch (err) {
    logger.error("Failed to parse JSON file:", err.message);
    process.exit(1);
  }

  if (!Array.isArray(channelsData)) {
    logger.error("Invalid format: Root element in JSON must be an array.");
    process.exit(1);
  }

  // Connect to MongoDB
  await connectDb();

  logger.info(`Starting bulk import of ${channelsData.length} channels to MongoDB...`);
  
  let addedCount = 0;
  let skippedCount = 0;

  try {
    const bulkOps = channelsData
      .filter((c) => {
        if (c.channelId && c.channelId.startsWith("UC")) {
          return true;
        }
        skippedCount++;
        return false;
      })
      .map((c) => ({
        updateOne: {
          filter: { _id: c.channelId },
          update: { $set: { displayName: c.displayName || "" } },
          upsert: true,
        },
      }));

    if (bulkOps.length > 0) {
      const result = await Channel.bulkWrite(bulkOps);
      addedCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);

      // Queue BullMQ subscription tasks
      for (const op of bulkOps) {
        const channelId = op.updateOne.filter._id;
        await queueManager.queueSubscriptionJob(channelId, "subscribe");
      }
    }

    logger.info(`Bulk import completed successfully.`);
    logger.info(`---------------------------------`);
    logger.info(`Total Processed: ${channelsData.length}`);
    logger.info(`Successfully Added/Updated: ${addedCount}`);
    logger.info(`Skipped/Failed:             ${skippedCount}`);
    logger.info(`---------------------------------`);
    logger.info(`Staggered WebSub subscription tasks have been queued in BullMQ.`);
  } catch (err) {
    logger.error("Error performing bulk import operation:", err);
  } finally {
    // Gracefully close MongoDB connection
    await mongoose.disconnect();
    logger.info("MongoDB disconnected. CLI shutdown.");
    process.exit(0);
  }
}

importChannels();

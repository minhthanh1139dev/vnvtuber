const mongoose = require("mongoose");
const config = require("./config");
const logger = require("./utils/logger");

async function connectDb() {
  try {
    logger.info(`Connecting to MongoDB at: ${config.mongoUri}`);
    
    // Connect using Mongoose (defaults are optimized for modern Node/Mongo)
    await mongoose.connect(config.mongoUri);
    
    logger.info("Successfully connected to MongoDB database.");
  } catch (error) {
    logger.error("Failed to establish connection to MongoDB:", error);
    process.exit(1);
  }
}

module.exports = connectDb;

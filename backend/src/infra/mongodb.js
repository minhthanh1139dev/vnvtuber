"use strict";

const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

class MongoDB {
  constructor() {
    this.connected = false;
  }

  async connect() {
    if (this.connected && mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const { url, database } = config.mongo;
    await mongoose.connect(url, { dbName: database });
    this.connected = true;
    const msg = `MongoDB connected (db: ${database})`;
    if (process.env.LOG_PROCESS === "api") {
      logger.debug(msg);
    } else {
      logger.info(msg);
    }
    return mongoose.connection;
  }

  async close() {
    if (!this.connected) return;
    await mongoose.disconnect();
    this.connected = false;
    logger.debug("MongoDB disconnected.");
  }
}

module.exports = new MongoDB();

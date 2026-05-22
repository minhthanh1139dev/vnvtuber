"use strict";

const mongoose = require("mongoose");
const config = require("../config");
const logger = require("../utils/logger");

function redactUrl(url) {
  return url.replace(/\/\/([^@/]+)@/, "//***@");
}

class MongoDB {
  constructor() {
    this.connected = false;
  }

  async connect() {
    if (this.connected && mongoose.connection.readyState === 1) {
      return mongoose.connection;
    }

    const { url, database } = config.mongo;
    logger.info(`MongoDB → ${redactUrl(url)} (db: ${database})`);
    await mongoose.connect(url, { dbName: database });
    this.connected = true;
    logger.info("MongoDB connected.");
    return mongoose.connection;
  }

  async close() {
    if (!this.connected) return;
    await mongoose.disconnect();
    this.connected = false;
    logger.info("MongoDB disconnected.");
  }
}

module.exports = new MongoDB();

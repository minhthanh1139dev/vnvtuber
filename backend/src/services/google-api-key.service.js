"use strict";

const config = require("../config");
const googleApiKeyRepository = require("../repositories/google-api-key.repository");
const logger = require("../utils/logger");
const { BAD_REQUEST, SERVICE_UNAVAILABLE } = require("../utils/response");

function maskKey(key) {
  if (!key || key.length < 8) return "****";
  return `****${key.slice(-4)}`;
}

class GoogleApiKeyService {
  constructor() {
    this._initialized = false;
    this._activeCount = 0;
  }

  maskKey(key) {
    return maskKey(key);
  }

  hasActiveKeys() {
    return this._activeCount > 0;
  }

  getActiveCount() {
    return this._activeCount;
  }

  async _refreshActiveCount() {
    this._activeCount = await googleApiKeyRepository.countByStatus("active");
    return this._activeCount;
  }

  async pickKey() {
    const row = await googleApiKeyRepository.findLeastUsedActiveWithKey();
    if (!row) {
      return null;
    }
    return {
      id: String(row._id),
      key: row.key,
      requestCount: row.requestCount,
    };
  }

  async syncFromEnvIfEmpty() {
    const activeCount = await googleApiKeyRepository.countByStatus("active");
    if (activeCount > 0) {
      return 0;
    }

    const envKeys = config.youtubeApiKeys || [];
    if (!envKeys.length) {
      return 0;
    }

    let imported = 0;
    for (const key of envKeys) {
      const existing = await googleApiKeyRepository.findByKey(key);
      if (existing) continue;

      await googleApiKeyRepository.create({
        key,
        status: "active",
      });
      imported += 1;
    }

    if (imported > 0) {
      logger.info(`[GOOGLE API KEY] Imported ${imported} key(s) from YOUTUBE_API_KEYS env`);
    }
    return imported;
  }

  async initialize() {
    await this.syncFromEnvIfEmpty();
    await this._refreshActiveCount();
    this._initialized = true;

    if (this._activeCount === 0) {
      logger.warn(
        "[GOOGLE API KEY] No active keys in database. Add via POST /api/google-api-keys or YOUTUBE_API_KEYS on first boot."
      );
    } else {
      logger.info(
        `[GOOGLE API KEY] Ready: ${this._activeCount} active key(s), pick lowest requestCount`
      );
    }
  }

  async ensureReady() {
    if (!this._initialized) {
      await this.initialize();
    }
    await this._refreshActiveCount();
    if (this._activeCount === 0) {
      throw new SERVICE_UNAVAILABLE({
        message: "No active Google API keys available. Add keys in admin or database.",
      });
    }
  }

  async markExhausted(id, lastError) {
    await googleApiKeyRepository.markExhausted(id, lastError);
    await this._refreshActiveCount();
    logger.warn(`[GOOGLE API KEY] Marked exhausted: ${id}`);
  }

  async recordSuccessfulUse(id) {
    await googleApiKeyRepository.touchUsed(id);
  }

  async listForAdmin() {
    const rows = await googleApiKeyRepository.findAllForAdmin();
    return rows.map((row) => ({
      id: row._id,
      status: row.status,
      keyMasked: maskKey(row.key),
      lastUsedAt: row.lastUsedAt,
      lastError: row.lastError,
      requestCount: row.requestCount,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));
  }

  async createKey({ key }) {
    const trimmed = String(key || "").trim();
    if (!trimmed) {
      throw new BAD_REQUEST({ message: "API key is required" });
    }

    const doc = await googleApiKeyRepository.create({
      key: trimmed,
      status: "active",
    });

    await this._refreshActiveCount();

    return {
      id: doc._id,
      status: doc.status,
      keyMasked: maskKey(trimmed),
      requestCount: doc.requestCount,
      createdAt: doc.createdAt,
    };
  }

  async updateKey(id, { status }) {
    if (status === undefined) {
      return googleApiKeyRepository.findById(id);
    }

    const row = await googleApiKeyRepository.updateById(id, { status });
    if (!row) return null;

    await this._refreshActiveCount();
    return {
      id: row._id,
      status: row.status,
      requestCount: row.requestCount,
      updatedAt: row.updatedAt,
    };
  }

  async deleteKey(id) {
    const deleted = await googleApiKeyRepository.deleteById(id);
    if (deleted) {
      await this._refreshActiveCount();
    }
    return Boolean(deleted);
  }
}

module.exports = new GoogleApiKeyService();

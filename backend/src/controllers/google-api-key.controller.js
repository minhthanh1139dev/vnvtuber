"use strict";

const googleApiKeyService = require("../services/google-api-key.service");
const {
  OK,
  CREATED,
  BAD_REQUEST,
  NOT_FOUND,
} = require("../utils/response");
const { wrapController } = require("../utils/asyncHandler");

class GoogleApiKeyController {
  async list(req, res) {
    const list = await googleApiKeyService.listForAdmin();
    return new OK({
      data: list,
      meta: { activeCount: googleApiKeyService.getActiveCount() },
    }).send(res);
  }

  async create(req, res) {
    const { key } = req.body;
    if (!key) {
      throw new BAD_REQUEST({ message: "key is required" });
    }

    const created = await googleApiKeyService.createKey({ key });
    return new CREATED({
      message: "Google API key added",
      data: created,
    }).send(res);
  }

  async update(req, res) {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== undefined && !["active", "disabled", "exhausted"].includes(status)) {
      throw new BAD_REQUEST({ message: "Invalid status" });
    }

    const updated = await googleApiKeyService.updateKey(id, { status });
    if (!updated) {
      throw new NOT_FOUND({ message: "API key not found" });
    }
    return new OK({ message: "Updated", data: updated }).send(res);
  }

  async remove(req, res) {
    const { id } = req.params;
    const removed = await googleApiKeyService.deleteKey(id);
    if (!removed) {
      throw new NOT_FOUND({ message: "API key not found" });
    }
    return new OK({ message: "Google API key deleted" }).send(res);
  }
}

module.exports = wrapController(new GoogleApiKeyController());

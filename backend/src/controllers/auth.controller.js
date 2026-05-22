"use strict";

const userService = require("../services/user.service");
const { OK } = require("../utils/response");
const { wrapController } = require("../utils/asyncHandler");

class AuthController {
  async login(req, res) {
    const { username, password } = req.body;
    const { token, user } = await userService.login(username, password);

    return new OK({
      message: "Login successful.",
      data: { token, user },
    }).send(res);
  }

  async changePassword(req, res) {
    const { currentPassword, newPassword } = req.body;
    await userService.changePassword(req.user._id, currentPassword, newPassword);

    return new OK({
      message: "Password updated successfully.",
    }).send(res);
  }
}

module.exports = wrapController(new AuthController());

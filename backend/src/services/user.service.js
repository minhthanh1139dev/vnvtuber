"use strict";

const jwt = require("jsonwebtoken");
const config = require("../config");
const userRepository = require("../repositories/user.repository");
const logger = require("../utils/logger");
const {
  BAD_REQUEST,
  UNAUTHORIZED,
  SERVICE_UNAVAILABLE,
} = require("../utils/response");

const MIN_PASSWORD_LENGTH = 8;

class UserService {
  getJwtSecret() {
    return config.jwtSecret || null;
  }

  assertJwtConfigured() {
    if (!this.getJwtSecret()) {
      throw new SERVICE_UNAVAILABLE({
        message: "Server auth is not configured (JWT_SECRET missing).",
      });
    }
  }

  toPublicProfile(user) {
    return {
      username: user.username,
      displayName: user.displayName,
      role: user.role,
      avatar: user.avatar,
    };
  }

  async authenticate(username, password) {
    if (!username || !password) {
      throw new BAD_REQUEST({
        message: "Username and password are required.",
      });
    }

    const user = await userRepository.findByUsername(username);
    if (!user) {
      throw new UNAUTHORIZED({
        message: "Invalid username or password.",
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw new UNAUTHORIZED({
        message: "Invalid username or password.",
      });
    }

    return user;
  }

  signAccessToken(user) {
    this.assertJwtConfigured();
    return jwt.sign({ userId: user._id, role: user.role }, this.getJwtSecret(), {
      expiresIn: "7d",
    });
  }

  verifyAccessToken(token) {
    this.assertJwtConfigured();
    return jwt.verify(token, this.getJwtSecret());
  }

  async login(username, password) {
    const user = await this.authenticate(username, password);
    await userRepository.updateLastLogin(user);
    const token = this.signAccessToken(user);
    logger.info(`[AUTH] Admin user '${user.username}' successfully logged in.`);
    return { token, user: this.toPublicProfile(user) };
  }

  async findSessionUser(userId) {
    return userRepository.findByIdWithoutPassword(userId);
  }

  async changePassword(userId, currentPassword, newPassword) {
    if (!currentPassword || !newPassword) {
      throw new BAD_REQUEST({
        message: "currentPassword and newPassword are required.",
      });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new BAD_REQUEST({
        message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.`,
      });
    }

    const user = await userRepository.findById(userId);
    if (!user) {
      throw new UNAUTHORIZED({
        message: "User associated with this session no longer exists.",
      });
    }

    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      throw new UNAUTHORIZED({
        message: "Current password is incorrect.",
      });
    }

    const isSamePassword = await user.comparePassword(newPassword);
    if (isSamePassword) {
      throw new BAD_REQUEST({
        message: "New password must be different from the current password.",
      });
    }

    user.password = newPassword;
    await user.save();
    logger.info(`[AUTH] Admin user '${user.username}' changed password successfully.`);
  }
}

module.exports = new UserService();

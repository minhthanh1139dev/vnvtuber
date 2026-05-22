"use strict";

const User = require("../models/user.model");

class UserRepository {
  findByUsername(username) {
    return User.findOne({ username: username.toLowerCase() });
  }

  findById(userId) {
    return User.findById(userId);
  }

  findByIdWithoutPassword(userId) {
    return User.findById(userId).select("-password").lean();
  }

  countDocuments() {
    return User.countDocuments();
  }

  create(userData) {
    const user = new User(userData);
    return user.save();
  }

  updateLastLogin(user) {
    user.lastLoginAt = new Date();
    return user.save();
  }
}

module.exports = new UserRepository();

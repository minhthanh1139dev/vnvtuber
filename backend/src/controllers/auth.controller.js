const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "vnvtuber-hub-neon-secret-key-123456";

module.exports = {
  /**
   * Authenticate admin / moderator users and issue JWT token.
   */
  async login(req, res) {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    try {
      const user = await User.findOne({ username: username.toLowerCase() });
      if (!user) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ error: "Invalid username or password." });
      }

      // Generate JWT
      const token = jwt.sign(
        { userId: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      // Update last login
      user.lastLoginAt = new Date();
      await user.save();

      logger.info(`[AUTH] Admin user '${user.username}' successfully logged in.`);

      res.json({
        message: "Login successful.",
        token,
        user: {
          username: user.username,
          displayName: user.displayName,
          role: user.role,
          avatar: user.avatar
        }
      });
    } catch (err) {
      logger.error("[AUTH ERROR] Login failed:", err);
      res.status(500).json({ error: "Internal server error during authentication." });
    }
  },

  /**
   * Bootstrap endpoint to create the very first admin user in the system.
   * Only works if no users exist in the collection.
   */
  async setup(req, res) {
    const { username, password, displayName, avatar } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: "Username and password are required for initial setup." });
    }

    try {
      const userCount = await User.countDocuments();
      if (userCount > 0) {
        return res.status(403).json({ error: "Setup can only be run when the system has no admin users." });
      }

      const newAdmin = new User({
        username: username.toLowerCase().trim(),
        password,
        displayName: displayName || "Super Admin",
        avatar: avatar || "",
        role: "admin"
      });

      await newAdmin.save();
      logger.info(`[SYSTEM SETUP] Initial admin user created: ${username}`);

      res.status(201).json({
        message: "Initial admin account registered successfully. System setup complete!",
        user: {
          username: newAdmin.username,
          displayName: newAdmin.displayName,
          role: newAdmin.role
        }
      });
    } catch (err) {
      logger.error("[AUTH ERROR] Setup failed:", err);
      res.status(500).json({ error: "Internal server error during initial setup." });
    }
  }
};

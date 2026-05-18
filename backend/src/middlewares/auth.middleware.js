const jwt = require("jsonwebtoken");
const User = require("../models/user.model");
const logger = require("../utils/logger");

const JWT_SECRET = process.env.JWT_SECRET || "vnvtuber-hub-neon-secret-key-123456";

module.exports = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Access token is missing or invalid." });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.userId).select("-password");
    if (!user) {
      return res.status(401).json({ error: "User associated with this token no longer exists." });
    }

    req.user = user;
    next();
  } catch (err) {
    logger.warn(`Failed authentication attempt: ${err.message}`);
    return res.status(401).json({ error: "Authentication failed. Token may be expired." });
  }
};

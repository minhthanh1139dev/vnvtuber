/**
 * Seed one admin user into MongoDB (mongosh).
 *
 * Default login after seed:
 *   username: admin
 *   password: changeme
 * Change USERNAME / PASSWORD_BCRYPT below before running in production.
 *
 * Generate a new bcrypt hash (Node, from backend/):
 *   node -e "require('bcryptjs').hash('YOUR_PASSWORD',10).then(console.log)"
 *
 * Usage (local):
 *   mongosh "mongodb://127.0.0.1:27017/vnvtuber" --file scripts/seed-admin.mongosh.js
 *
 * Usage (Atlas):
 *   mongosh "mongodb+srv://USER:PASS@cluster.mongodb.net/vnvtuber" --file scripts/seed-admin.mongosh.js
 *
 * Or inside mongosh:
 *   load("scripts/seed-admin.mongosh.js")
 */

const DB_NAME = "vnvtuber";
const USERNAME = "admin";
/** bcrypt hash of plaintext password: changeme */
const PASSWORD_BCRYPT =
  "$2b$10$PtgrhRfSxTsZAucXPiuGc.YNVBAbqQP04vsHiFl596CrSSL5ihFza";
const DISPLAY_NAME = "VNvtuber Admin";
const ROLE = "admin";

const dbRef = db.getSiblingDB(DB_NAME);
const normalizedUsername = USERNAME.toLowerCase().trim();
const now = new Date();

const existing = dbRef.users.findOne({ username: normalizedUsername });

if (existing) {
  print(
    `[seed-admin] User "${normalizedUsername}" already exists (_id=${existing._id}). Skipping.`,
  );
} else {
  const result = dbRef.users.insertOne({
    username: normalizedUsername,
    password: PASSWORD_BCRYPT,
    displayName: DISPLAY_NAME,
    role: ROLE,
    avatar: "",
    createdAt: now,
    updatedAt: now,
  });

  print(
    `[seed-admin] Created admin user "${normalizedUsername}" (_id=${result.insertedId}).`,
  );
  print(
    "[seed-admin] Login via POST /api/auth/login with the password you hashed above.",
  );
}

print(
  `[seed-admin] Total users in ${DB_NAME}.users: ${dbRef.users.countDocuments()}`,
);

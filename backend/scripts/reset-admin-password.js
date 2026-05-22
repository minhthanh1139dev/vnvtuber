#!/usr/bin/env node
require("dotenv").config();

const { mongo } = require("../src/infra");
const User = require("../src/models/user.model");

function readArg(flag) {
  const index = process.argv.indexOf(flag);
  if (index === -1) return null;
  return process.argv[index + 1] || null;
}

async function main() {
  const username = (readArg("--username") || process.env.ADMIN_USERNAME || "").trim().toLowerCase();
  const password = readArg("--password") || process.env.ADMIN_PASSWORD || "";

  if (!username || !password) {
    console.error(
      "Usage: node scripts/reset-admin-password.js --username <admin> --password <new-password>"
    );
    console.error(
      "You can also provide ADMIN_USERNAME and ADMIN_PASSWORD as environment variables."
    );
    process.exit(1);
  }

  if (password.length < 8) {
    console.error("New password must be at least 8 characters long.");
    process.exit(1);
  }

  await mongo.connect();

  const user = await User.findOne({ username });
  if (!user) {
    console.error(`Admin user '${username}' was not found.`);
    process.exitCode = 1;
    return;
  }

  user.password = password;
  await user.save();

  console.log(`Password reset completed for '${username}'.`);
}

main()
  .catch((err) => {
    console.error("Failed to reset admin password:", err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    try {
      await mongo.close();
    } catch (_) {
      // no-op
    }
  });

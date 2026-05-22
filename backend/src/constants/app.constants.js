"use strict";

const envInt = (key, fallback) => {
  const n = parseInt(process.env[key], 10);
  return Number.isFinite(n) ? n : fallback;
};

const corsOrigins = () => {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw || raw === "*") return "*";
  return raw.split(",").map((o) => o.trim()).filter(Boolean);
};

module.exports = {
  API_PREFIX: "/api",
  WEBHOOK_PREFIX: "/youtube",

  CORS_ORIGINS: corsOrigins(),

  GLOBAL_RATE_LIMIT_WINDOW_MS: envInt("GLOBAL_RATE_LIMIT_WINDOW_MS", 60_000),
  GLOBAL_RATE_LIMIT_MAX: envInt("GLOBAL_RATE_LIMIT_MAX", 120),
  LOGIN_RATE_LIMIT_WINDOW_MS: envInt("LOGIN_RATE_LIMIT_WINDOW_MS", envInt("LOGIN_BLOCK_WINDOW_MS", 900_000)),
  LOGIN_MAX_FAILED_ATTEMPTS: envInt("LOGIN_MAX_FAILED_ATTEMPTS", 10),

  DEFAULT_PAGE_LIMIT: 50,
  MAX_PAGE_LIMIT: 100,
};

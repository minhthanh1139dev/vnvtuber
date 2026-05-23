"use strict";

const REDACTED = "[REDACTED]";
const MAX_STRING_LEN = 500;

const SENSITIVE_KEY = /^(password|currentpassword|newpassword|confirmpassword|token|accesstoken|refreshtoken|secret|apikey|authorization|cookie|jwt|privatekey|key)$/i;
const SENSITIVE_PARTIAL = /password|secret|token/i;
const EMAIL_KEY = /email/i;

function resolveUserId(req) {
  const user = req?.user;
  if (!user) return null;
  if (user._id != null) return String(user._id);
  if (user.id != null) return String(user.id);
  return null;
}

function sanitizeKey(key, value, req) {
  const normalized = String(key).toLowerCase();

  if (SENSITIVE_KEY.test(normalized) || SENSITIVE_PARTIAL.test(normalized)) {
    return REDACTED;
  }

  if (EMAIL_KEY.test(normalized)) {
    const userId = resolveUserId(req);
    return userId ? `[userId:${userId}]` : REDACTED;
  }

  return sanitizePayload(value, req);
}

function sanitizePayload(payload, req) {
  if (payload == null) return payload;

  if (typeof payload === "string") {
    if (payload.length <= MAX_STRING_LEN) return payload;
    return `${payload.slice(0, MAX_STRING_LEN)}…[truncated ${payload.length} chars]`;
  }

  if (Array.isArray(payload)) {
    return payload.map((item) => sanitizePayload(item, req));
  }

  if (typeof payload !== "object") {
    return payload;
  }

  const out = {};
  for (const [key, value] of Object.entries(payload)) {
    out[key] = sanitizeKey(key, value, req);
  }
  return out;
}

function sanitizeHeaders(headers = {}) {
  const out = { ...headers };
  for (const key of Object.keys(out)) {
    const lower = key.toLowerCase();
    if (
      lower === "authorization" ||
      lower === "cookie" ||
      lower === "set-cookie" ||
      lower === "x-api-key"
    ) {
      out[key] = REDACTED;
    }
  }
  return out;
}

module.exports = {
  REDACTED,
  sanitizePayload,
  sanitizeHeaders,
  resolveUserId,
};

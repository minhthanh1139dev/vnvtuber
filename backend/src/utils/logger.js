const winston = require("winston");
const path = require("path");
const fs = require("fs");
const { PassThrough } = require("readable-stream");

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_SIZE = 50 * 1024 * 1024; // 50MB per active file
const KEEP_BACKUPS = 3;
const LOG_PROCESS = (process.env.LOG_PROCESS || "").toLowerCase();

const ALLOWED = new Set(["api", "worker", "scheduler"]);
const processName = ALLOWED.has(LOG_PROCESS) ? LOG_PROCESS : "api";

const LOG_PATHS = {
  all: path.join(LOG_DIR, `${processName}.log`),
  error: path.join(LOG_DIR, `${processName}.error.log`),
};

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

function cleanOldBackups(filePath, keepCount = KEEP_BACKUPS) {
  const dir = path.dirname(filePath);
  const base = path.basename(filePath);

  const backups = fs
    .readdirSync(dir)
    .filter((f) => f.startsWith(`${base}.`) && f.endsWith(".bak"))
    .map((f) => {
      const full = path.join(dir, f);
      return { path: full, ts: fs.statSync(full).mtimeMs };
    })
    .sort((a, b) => b.ts - a.ts);

  backups.slice(keepCount).forEach((f) => fs.unlinkSync(f.path));
}

function rotateIfOversized(filePath) {
  try {
    const { size } = fs.statSync(filePath);
    if (size < MAX_SIZE) return false;

    fs.renameSync(filePath, `${filePath}.${Date.now()}.bak`);
    cleanOldBackups(filePath, KEEP_BACKUPS);
    return true;
  } catch (err) {
    if (err.code === "ENOENT") return false;
    throw err;
  }
}

/** After rename, force Winston to open a fresh file on the next write (lazy transport). */
function resetTransportAfterRotate(transport) {
  transport._fileExist = false;
  transport._size = 0;
  transport._pendingSize = 0;
  transport._opening = false;
  transport._rotate = false;

  if (transport._dest) {
    transport._cleanupStream(transport._dest);
    transport._dest = null;
  }
  if (transport._stream) {
    transport._cleanupStream(transport._stream);
    transport._stream = new PassThrough();
    transport._stream.setMaxListeners(30);
  }
}

function rotateBeforeWrite(filePath, getTransport) {
  return winston.format((info) => {
    if (rotateIfOversized(filePath)) {
      resetTransportAfterRotate(getTransport());
    }
    return info;
  })();
}

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `[${timestamp}] [${level}] [${processName}]: ${message}\n${stack}`;
    }
    return `[${timestamp}] [${level}] [${processName}]: ${message}`;
  })
);

let errorFileTransport;
let allFileTransport;

errorFileTransport = new winston.transports.File({
  filename: LOG_PATHS.error,
  level: "error",
  lazy: true,
  format: winston.format.combine(
    rotateBeforeWrite(LOG_PATHS.error, () => errorFileTransport),
    logFormat
  ),
});

allFileTransport = new winston.transports.File({
  filename: LOG_PATHS.all,
  lazy: true,
  format: winston.format.combine(
    rotateBeforeWrite(LOG_PATHS.all, () => allFileTransport),
    logFormat
  ),
});

/** API: info+ on console (HTTP via express-winston). Worker/scheduler: info+ for ops visibility. */
const CONSOLE_LEVEL = { api: "info", worker: "info", scheduler: "info" };

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  defaultMeta: { process: processName },
  transports: [errorFileTransport, allFileTransport],
});

logger.add(
  new winston.transports.Console({
    format: consoleFormat,
    level: CONSOLE_LEVEL[processName] ?? "info",
  })
);

logger.debug(
  `Logger ready → logs/${processName}.log (rotate at ${MAX_SIZE / 1024 / 1024}MB, keep ${KEEP_BACKUPS} backups)`
);

module.exports = logger;

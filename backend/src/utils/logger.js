const winston = require("winston");
const path = require("path");
const fs = require("fs");

const LOG_DIR = path.join(process.cwd(), "logs");
const MAX_SIZE = 20 * 1024 * 1024; // 20MB per file
const MAX_FILES = 5;
const LOG_PROCESS = (process.env.LOG_PROCESS || "app").toLowerCase();

const ALLOWED = new Set(["api", "worker", "scheduler", "app"]);
const processName = ALLOWED.has(LOG_PROCESS) ? LOG_PROCESS : "app";

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true });
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

const fileOptions = {
  maxsize: MAX_SIZE,
  maxFiles: MAX_FILES,
};

const logger = winston.createLogger({
  level: process.env.NODE_ENV === "development" ? "debug" : "info",
  format: logFormat,
  defaultMeta: { process: processName },
  transports: [
    new winston.transports.File({
      filename: path.join(LOG_DIR, `${processName}.error.log`),
      level: "error",
      ...fileOptions,
    }),
    new winston.transports.File({
      filename: path.join(LOG_DIR, `${processName}.log`),
      ...fileOptions,
    }),
  ],
});

logger.add(
  new winston.transports.Console({
    format: consoleFormat,
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
  })
);

logger.info(`Logger initialized → logs/${processName}.log (max ${MAX_SIZE / 1024 / 1024}MB × ${MAX_FILES} files)`);

module.exports = logger;

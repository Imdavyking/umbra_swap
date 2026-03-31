import { createLogger, format, transports } from "winston";
import "winston-daily-rotate-file";
import path, { dirname, join } from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

function setup_HandleError(error: unknown, context: string): void {
  if (error instanceof Error) {
    if (error.message.includes("net::ERR_ABORTED")) {
      logger.error(`ABORTION error occurred in ${context}: ${error.message}`);
    } else {
      logger.error(`Error in ${context}: ${error.message}`);
    }
  } else {
    logger.error(`An unknown error occurred in ${context}: ${error}`);
  }
}

// Ensure the logs directory exists
const logDir = join(__dirname, "../logs");
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Define log levels and their corresponding colors
const logLevels = {
  levels: {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  },
  colors: {
    error: "red",
    warn: "yellow",
    info: "green",
    debug: "blue",
  },
};

// Custom function to format the timestamp
const customTimestamp = () => {
  const now = new Date();
  const hours = now.getHours();
  const minutes = now.getMinutes();
  const seconds = now.getSeconds();
  const ampm = hours >= 12 ? "PM" : "AM";
  const formattedTime = `${hours % 12 || 12}:${
    minutes < 10 ? "0" + minutes : minutes
  }:${seconds < 10 ? "0" + seconds : seconds} ${ampm}`;
  return formattedTime;
};

// Function to get emojis based on log level
const getEmojiForLevel = (level: string): string => {
  switch (level) {
    case "info":
      return "💡";
    case "error":
      return "🚨";
    case "warn":
      return "⚠️";
    case "debug":
      return "🐞";
    default:
      return "🔔";
  }
};

const logger = createLogger({
  levels: logLevels.levels,
  format: format.combine(
    format.timestamp({ format: customTimestamp }),
    format.colorize(),
    format.printf(({ timestamp, level, message }) => {
      const emoji = getEmojiForLevel(level);
      return `${timestamp} ${emoji} [${level}]: ${message}`;
    }),
  ),
  transports: [
    new transports.Console({
      level: process.env.NODE_ENV === "production" ? "info" : "debug",
      format: format.combine(format.colorize(), format.simple()),
    }),
    new transports.DailyRotateFile({
      filename: "logs/%DATE%-combined.log",
      datePattern: "YYYY-MM-DD",
      level: "info",
      maxFiles: "14d",
      maxSize: "20m",
      zippedArchive: true,
      format: format.combine(format.timestamp(), format.json()),
    }),
    new transports.DailyRotateFile({
      filename: "logs/%DATE%-error.log",
      datePattern: "YYYY-MM-DD",
      level: "error",
      maxFiles: "14d",
      maxSize: "20m",
      zippedArchive: true,
      format: format.combine(format.timestamp(), format.json()),
    }),
    new transports.DailyRotateFile({
      filename: "logs/%DATE%-debug.log",
      datePattern: "YYYY-MM-DD",
      level: "debug",
      maxFiles: "14d",
      maxSize: "20m",
      zippedArchive: true,
      format: format.combine(format.timestamp(), format.json()),
    }),
  ],
});

// Set 777 permissions
try {
  fs.chmodSync(logDir, 0o777);
} catch (error: any) {
  logger.error(`Could not set permissions for ${logDir}:`, error.message);
}

export function setupErrorHandlers(): void {
  process.on("unhandledRejection", (error: unknown) => {
    setup_HandleError(error, "Unhandled Rejection");
    process.exit(1);
  });

  process.on("uncaughtException", (error) => {
    setup_HandleError(error, "Uncaught Exception");
    process.exit(1);
  });

  process.on("warning", (warning) => {
    logger.warn(`Warning: ${warning.message || warning}`);
  });
}

export default logger;

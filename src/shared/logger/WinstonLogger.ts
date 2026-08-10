import fs from "fs";
import path from "path";
import winston from "winston";

import { ILogger } from "./ILogger";

import { errorFilter, warnFilter, infoFilter, debugFilter } from "./logFilters";
import { injectable } from "inversify";

const logDirectory = path.join(process.cwd(), "logs");

if (!fs.existsSync(logDirectory)) {
  fs.mkdirSync(logDirectory);
}

const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: "YYYY-MM-DD HH:mm:ss",
  }),

  winston.format.printf(
    ({ timestamp, level, message }) => `[${timestamp}] ${level.toUpperCase()} : ${message}`,
  ),
);

const logger = winston.createLogger({
  level: "debug",

  transports: [
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/error.log",
      format: winston.format.combine(errorFilter(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/warn.log",
      format: winston.format.combine(warnFilter(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/info.log",
      format: winston.format.combine(infoFilter(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/debug.log",
      format: winston.format.combine(debugFilter(), logFormat),
    }),

    new winston.transports.File({
      filename: "logs/combined.log",
      format: logFormat,
    }),
  ],
});

@injectable()
export class WinstonLogger implements ILogger {
  info(message: string): void {
    logger.info(message);
  }

  warn(message: string): void {
    logger.warn(message);
  }

  error(message: string): void {
    logger.error(message);
  }

  debug(message: string): void {
    logger.debug(message);
  }
}

/**
 * Usage

Instead of: console.log(user);

use
logger.info(`User Logged In : ${user.email}`);

Errors
logger.error(error.message);

Warnings
logger.warn("Refresh token expired");

Debug
logger.debug("Entered AuthService");
 */

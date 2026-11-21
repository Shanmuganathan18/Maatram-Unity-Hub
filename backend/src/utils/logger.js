/**
 * src/utils/logger.js
 * Structured Winston logger.
 * Logs to console (always) and optionally to rotating files (LOG_TO_FILE=true).
 */
const { createLogger, format, transports } = require('winston');
const env = require('../config/env');

const { combine, timestamp, errors, json, colorize, printf } = format;

const devFormat = combine(
  colorize({ all: true }),
  timestamp({ format: 'HH:mm:ss' }),
  errors({ stack: true }),
  printf(({ timestamp: ts, level, message, stack, ...meta }) => {
    const extra = Object.keys(meta).length ? ' ' + JSON.stringify(meta) : '';
    return `${ts} [${level}] ${stack || message}${extra}`;
  }),
);

const prodFormat = combine(timestamp(), errors({ stack: true }), json());

const loggerTransports = [
  new transports.Console({
    format: env.isDev ? devFormat : prodFormat,
  }),
];

if (env.log.toFile) {
  loggerTransports.push(
    new transports.File({ filename: 'logs/error.log', level: 'error', format: prodFormat }),
    new transports.File({ filename: 'logs/combined.log', format: prodFormat }),
  );
}

const logger = createLogger({
  level: env.log.level,
  transports: loggerTransports,
  // Do not exit on unhandled promise rejections (we handle those ourselves)
  exitOnError: false,
});

module.exports = logger;


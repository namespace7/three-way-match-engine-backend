const winston = require('winston');
const env = require('../config/env');

/**
 * Returns the appropriate log level for the current environment.
 * - production → 'info'   (suppress debug/verbose noise)
 * - test       → 'warn'   (keep test output clean)
 * - default    → 'debug'  (maximum verbosity for development)
 * @returns {string} Winston log level string.
 */
const resolveLogLevel = () => {
  if (env.isProduction) return 'info';
  if (env.isTest) return 'warn';
  return 'debug';
};

/**
 * Serializes any extra metadata fields appended to a log call.
 * Returns an empty string when there is no additional data.
 * @param {Record<string, unknown>} metadata
 * @returns {string}
 */
const serializeMetadata = (metadata) => {
  const keys = Object.keys(metadata);
  return keys.length ? ` ${JSON.stringify(metadata, null, 0)}` : '';
};

const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(({ timestamp, level, message, ...metadata }) =>
    `[${timestamp}] ${level}: ${message}${serializeMetadata(metadata)}`
  )
);

/**
 * Application-wide singleton logger.
 * Console-only transport; no file sinks.
 */
const logger = winston.createLogger({
  level: resolveLogLevel(),
  format: consoleFormat,
  transports: [
    new winston.transports.Console({
      handleExceptions: true,
      handleRejections: true,
    }),
  ],
  exitOnError: false,
});

module.exports = logger;

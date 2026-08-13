const app = require('./app');
const env = require('./config/env');
const connectDB = require('./config/db');
const logger = require('./shared/logger');

// ---------------------------------------------------------------------------
// Process-level guards — must be registered before anything async runs
// ---------------------------------------------------------------------------

/**
 * Catches synchronous exceptions that escape all try/catch blocks.
 * Logs and exits immediately; no cleanup is safe at this point.
 */
process.on('uncaughtException', (error) => {
  logger.error(`[Process] Uncaught exception: ${error.message}`, { stack: error.stack });
  process.exit(1);
});

/**
 * Catches promise rejections that were never handled by a .catch() or try/catch.
 * Attempts a graceful HTTP-server close before exiting.
 * @param {unknown} reason - The rejection value.
 */
process.on('unhandledRejection', (reason) => {
  const message = reason instanceof Error ? reason.message : String(reason);
  const stack = reason instanceof Error ? reason.stack : undefined;

  logger.error(`[Process] Unhandled promise rejection: ${message}`, { stack });

  // Give the HTTP server a chance to finish in-flight requests
  if (server) {
    server.close(() => process.exit(1));
  } else {
    process.exit(1);
  }
});

// ---------------------------------------------------------------------------
// Bootstrap
// ---------------------------------------------------------------------------

/** Reference held so the unhandledRejection handler can close the server. */
let server;

/**
 * Connects to MongoDB, then starts the HTTP server.
 * Any startup error is caught here and logged before the process exits.
 */
const bootstrap = async () => {
  await connectDB();

  server = app.listen(env.PORT, () => {
    logger.info(
      `[Server] Listening on port ${env.PORT} — environment: ${env.NODE_ENV}`
    );
  });
};

/**
 * Handles graceful shutdown signals (SIGTERM / SIGINT).
 * Closes the HTTP server to finish in-flight requests and closes DB connection cleanly.
 */
const mongoose = require('mongoose');

const gracefulShutdown = (signal) => {
  logger.info(`[Server] Received ${signal}. Initiating graceful shutdown...`);
  if (server) {
    server.close(async () => {
      logger.info('[Server] HTTP server closed cleanly.');
      try {
        await mongoose.disconnect();
        logger.info('[Server] MongoDB connection closed.');
      } catch (err) {
        logger.error('[Server] Error during DB disconnect:', { error: err.message });
      }
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

(async () => {
  try {
    await bootstrap();
  } catch (error) {
    logger.error(`[Server] Startup failed: ${error.message}`, { stack: error.stack });
    process.exit(1);
  }
})();

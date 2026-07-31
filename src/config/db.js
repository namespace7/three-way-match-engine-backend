const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/logger');

/**
 * Establishes a connection to MongoDB.
 * Exits the process with code 1 if the initial connection fails.
 * @returns {Promise<mongoose.Connection>} The active Mongoose connection.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`[Database] MongoDB connected: ${conn.connection.host}`);
    return conn.connection;
  } catch (error) {
    logger.error(`[Database] Initial connection failed: ${error.message}`, {
      stack: error.stack,
    });
    process.exit(1);
  }
};

/**
 * Closes the Mongoose connection cleanly on process termination signals.
 * @param {string} signal - The OS signal triggering the shutdown (e.g. 'SIGINT').
 */
const gracefulShutdown = async (signal) => {
  try {
    await mongoose.connection.close();
    logger.info(`[Database] Connection closed gracefully on ${signal}`);
    process.exit(0);
  } catch (error) {
    logger.error(`[Database] Failed to close connection cleanly on ${signal}: ${error.message}`, {
      stack: error.stack,
    });
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

module.exports = connectDB;
module.exports.connectDB = connectDB;

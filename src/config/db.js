const mongoose = require('mongoose');
const env = require('./env');
const logger = require('../shared/logger');

const PurchaseOrderModel = require('../models/PurchaseOrderModel');
const GRNModel = require('../models/GRNModel');
const InvoiceModel = require('../models/InvoiceModel');
const SKUModel = require('../models/SKUModel');

/**
 * Automatically synchronizes Mongoose schema index definitions with the MongoDB database.
 * If legacy unique indexes exist in MongoDB (e.g., idx_po_number, idx_grn_number, idx_invoice_number),
 * syncIndexes() safely drops the unique constraint from MongoDB to allow duplicate document uploads.
 */
const syncDocumentIndexes = async () => {
  try {
    const models = [
      { model: PurchaseOrderModel, name: 'PurchaseOrder' },
      { model: GRNModel, name: 'GRN' },
      { model: InvoiceModel, name: 'Invoice' },
      { model: SKUModel, name: 'SKU' },
    ];

    for (const { model, name } of models) {
      if (model && typeof model.syncIndexes === 'function') {
        await model.syncIndexes();
      }
    }
    logger.info('[Database] MongoDB collection indexes synchronized successfully.');
  } catch (err) {
    logger.warn(`[Database] Collection index sync notice: ${err.message}`);
  }
};

/**
 * Establishes a connection to MongoDB and runs index synchronization.
 * Exits the process with code 1 if the initial connection fails.
 * @returns {Promise<mongoose.Connection>} The active Mongoose connection.
 */
const connectDB = async () => {
  try {
    const conn = await mongoose.connect(env.MONGODB_URI);
    logger.info(`[Database] MongoDB connected: ${conn.connection.host}`);
    await syncDocumentIndexes();
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

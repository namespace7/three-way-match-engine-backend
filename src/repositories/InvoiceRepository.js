'use strict';

const InvoiceModel = require('../models/InvoiceModel');

/**
 * @class InvoiceRepository
 *
 * Data access layer for the `invoices` collection.
 *
 * Responsibilities:
 *  - Create, read, update, delete Invoice documents.
 *  - Translate query parameters into Mongoose calls.
 *
 * Explicitly excluded:
 *  - Business logic        (belongs in domain layer)
 *  - Validation            (belongs in validator layer)
 *  - Matching calculations (belongs in matching engine)
 *  - HTTP / Express        (belongs in controller layer)
 */
class InvoiceRepository {
  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Inserts a new Invoice document.
   * @param {Object} data - Plain object matching the Invoice schema.
   * @returns {Promise<import('mongoose').Document>} The saved document.
   */
  async create(data) {
    const doc = new InvoiceModel(data);
    return doc.save();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Finds a single Invoice by its unique `invoiceNumber`.
   * @param {string} invoiceNumber
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByInvoiceNumber(invoiceNumber) {
    return InvoiceModel.findOne({ invoiceNumber }).lean();
  }

  /**
   * Finds a single Invoice by its MongoDB `_id`.
   * @param {string} id - MongoDB ObjectId string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return InvoiceModel.findById(id).lean();
  }

  /**
   * Returns all Invoices that reference the given `poReference`.
   * Uses the `idx_invoice_po_reference` index.
   * @param {string}  poReference
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByPoReference(poReference, { limit = 50, skip = 0, sort = { createdAt: -1 } } = {}) {
    return InvoiceModel
      .find({ poReference })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all Invoices that reference the given `grnReference`.
   * @param {string}  grnReference
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByGrnReference(grnReference, { limit = 50, skip = 0, sort = { createdAt: -1 } } = {}) {
    return InvoiceModel
      .find({ grnReference })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all Invoices matching the given filter.
   * @param {Object}  [filter={}]
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @param {string}  [options.projection]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findMany(filter = {}, { limit = 50, skip = 0, sort = { createdAt: -1 }, projection } = {}) {
    return InvoiceModel
      .find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Counts documents matching the given filter.
   * @param {Object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return InvoiceModel.countDocuments(filter);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Applies a partial update to an Invoice identified by `invoiceNumber`.
   * @param {string} invoiceNumber
   * @param {Object} updates - Fields to update (merged with $set).
   * @returns {Promise<import('mongoose').Document|null>} The updated document.
   */
  async updateByInvoiceNumber(invoiceNumber, updates) {
    return InvoiceModel.findOneAndUpdate(
      { invoiceNumber },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Applies a partial update to an Invoice identified by MongoDB `_id`.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, updates) {
    return InvoiceModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently removes an Invoice by `invoiceNumber`.
   * @param {string} invoiceNumber
   * @returns {Promise<import('mongoose').Document|null>} The deleted document.
   */
  async deleteByInvoiceNumber(invoiceNumber) {
    return InvoiceModel.findOneAndDelete({ invoiceNumber }).lean();
  }

  /**
   * Permanently removes an Invoice by MongoDB `_id`.
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async deleteById(id) {
    return InvoiceModel.findByIdAndDelete(id).lean();
  }
}

module.exports = InvoiceRepository;

'use strict';

const GRNModel = require('../models/GRNModel');

/**
 * @class GRNRepository
 *
 * Data access layer for the `grns` collection.
 *
 * Responsibilities:
 *  - Create, read, update, delete GRN documents.
 *  - Translate query parameters into Mongoose calls.
 *
 * Explicitly excluded:
 *  - Business logic        (belongs in domain layer)
 *  - Validation            (belongs in validator layer)
 *  - Matching calculations (belongs in matching engine)
 *  - HTTP / Express        (belongs in controller layer)
 */
class GRNRepository {
  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Inserts a new GRN document.
   * @param {Object} data - Plain object matching the GRN schema.
   * @returns {Promise<import('mongoose').Document>} The saved document.
   */
  async create(data) {
    const doc = new GRNModel(data);
    return doc.save();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Finds a single GRN by its unique `grnNumber`.
   * @param {string} grnNumber
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByGrnNumber(grnNumber) {
    return GRNModel.findOne({ grnNumber }).lean();
  }

  /**
   * Finds a single GRN by its MongoDB `_id`.
   * @param {string} id - MongoDB ObjectId string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return GRNModel.findById(id).lean();
  }

  /**
   * Returns all GRNs that reference the given `poNumber`.
   * Uses the `idx_grn_po_reference` index.
   * @param {string}  poReference - The PO number to look up against.
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findByPoReference(poReference, { limit = 50, skip = 0, sort = { createdAt: -1 } } = {}) {
    return GRNModel
      .find({ poReference })
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all GRNs matching the given filter.
   * @param {Object}  [filter={}]
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @param {string}  [options.projection]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findMany(filter = {}, { limit = 50, skip = 0, sort = { createdAt: -1 }, projection } = {}) {
    return GRNModel
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
    return GRNModel.countDocuments(filter);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Applies a partial update to a GRN identified by `grnNumber`.
   * @param {string} grnNumber
   * @param {Object} updates - Fields to update (merged with $set).
   * @returns {Promise<import('mongoose').Document|null>} The updated document.
   */
  async updateByGrnNumber(grnNumber, updates) {
    return GRNModel.findOneAndUpdate(
      { grnNumber },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Applies a partial update to a GRN identified by MongoDB `_id`.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, updates) {
    return GRNModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently removes a GRN by `grnNumber`.
   * @param {string} grnNumber
   * @returns {Promise<import('mongoose').Document|null>} The deleted document.
   */
  async deleteByGrnNumber(grnNumber) {
    return GRNModel.findOneAndDelete({ grnNumber }).lean();
  }

  /**
   * Permanently removes a GRN by MongoDB `_id`.
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async deleteById(id) {
    return GRNModel.findByIdAndDelete(id).lean();
  }
}

module.exports = GRNRepository;

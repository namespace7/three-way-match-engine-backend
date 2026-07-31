'use strict';

const PurchaseOrderModel = require('../models/PurchaseOrderModel');

/**
 * @class PurchaseOrderRepository
 *
 * Data access layer for the `purchase_orders` collection.
 *
 * Responsibilities:
 *  - Create, read, update, delete Purchase Order documents.
 *  - Translate query parameters into Mongoose calls.
 *
 * Explicitly excluded:
 *  - Business logic        (belongs in domain layer)
 *  - Validation            (belongs in validator layer)
 *  - Matching calculations (belongs in matching engine)
 *  - HTTP / Express        (belongs in controller layer)
 */
class PurchaseOrderRepository {
  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Inserts a new Purchase Order document.
   * @param {Object} data - Plain object matching the PurchaseOrder schema.
   * @returns {Promise<import('mongoose').Document>} The saved document.
   */
  async create(data) {
    const doc = new PurchaseOrderModel(data);
    return doc.save();
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Finds a single Purchase Order by its unique `poNumber`.
   * @param {string} poNumber
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByPoNumber(poNumber) {
    return PurchaseOrderModel.findOne({ poNumber }).lean();
  }

  /**
   * Finds a single Purchase Order by its MongoDB `_id`.
   * @param {string} id - MongoDB ObjectId string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return PurchaseOrderModel.findById(id).lean();
  }

  /**
   * Returns all Purchase Orders matching the given filter.
   * @param {Object}  [filter={}]           - Mongoose query filter.
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=50]    - Max documents to return.
   * @param {number}  [options.skip=0]      - Documents to skip (pagination).
   * @param {Object}  [options.sort]        - Mongoose sort object (e.g. { issueDate: -1 }).
   * @param {string}  [options.projection]  - Space-separated field names to include/exclude.
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findMany(filter = {}, { limit = 50, skip = 0, sort = { createdAt: -1 }, projection } = {}) {
    return PurchaseOrderModel
      .find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns all Purchase Orders associated with a given supplier taxId.
   * @param {string}  taxId
   * @param {Object}  [options={}] - Forwarded to findMany.
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findBySupplierTaxId(taxId, options = {}) {
    return this.findMany({ 'supplier.taxId': taxId }, options);
  }

  /**
   * Counts documents matching the given filter.
   * @param {Object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return PurchaseOrderModel.countDocuments(filter);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Applies a partial update to a Purchase Order identified by `poNumber`.
   * @param {string} poNumber
   * @param {Object} updates - Fields to update (merged with $set).
   * @returns {Promise<import('mongoose').Document|null>} The updated document.
   */
  async updateByPoNumber(poNumber, updates) {
    return PurchaseOrderModel.findOneAndUpdate(
      { poNumber },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Applies a partial update to a Purchase Order identified by MongoDB `_id`.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, updates) {
    return PurchaseOrderModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently removes a Purchase Order by `poNumber`.
   * @param {string} poNumber
   * @returns {Promise<import('mongoose').Document|null>} The deleted document.
   */
  async deleteByPoNumber(poNumber) {
    return PurchaseOrderModel.findOneAndDelete({ poNumber }).lean();
  }

  /**
   * Permanently removes a Purchase Order by MongoDB `_id`.
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async deleteById(id) {
    return PurchaseOrderModel.findByIdAndDelete(id).lean();
  }
}

module.exports = PurchaseOrderRepository;

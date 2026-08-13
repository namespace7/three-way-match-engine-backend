'use strict';

const SKUModel = require('../models/SKUModel');

/**
 * @class SKURepository
 *
 * Data access layer for the `skus` collection.
 *
 * Responsibilities:
 *  - Create, read, update, delete SKU documents.
 *  - Translate query parameters into Mongoose calls.
 *
 * Explicitly excluded:
 *  - Business logic        (belongs in domain layer)
 *  - Price tolerance logic (belongs in SKU domain object)
 *  - HTTP / Express        (belongs in controller layer)
 */
class SKURepository {
  // ── Create ──────────────────────────────────────────────────────────────────

  /**
   * Inserts a new SKU document.
   * @param {Object} data - Plain object matching the SKU schema.
   * @returns {Promise<import('mongoose').Document>} The saved document.
   */
  async create(data) {
    const doc = new SKUModel(data);
    return doc.save();
  }

  /**
   * Inserts multiple SKU documents in a single operation.
   * @param {Object[]} dataArray - Array of plain objects matching the SKU schema.
   * @returns {Promise<import('mongoose').Document[]>} The inserted documents.
   */
  async createMany(dataArray) {
    return SKUModel.insertMany(dataArray, { ordered: false });
  }

  // ── Read ────────────────────────────────────────────────────────────────────

  /**
   * Finds a single SKU by its unique `skuCode`.
   * Uses the `idx_sku_code` index.
   * @param {string} skuCode
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findBySkuCode(skuCode) {
    return SKUModel.findOne({ skuCode }).lean();
  }

  /**
   * Finds a single SKU by its EAN/GTIN barcode.
   * Uses the `idx_sku_ean_code` sparse index.
   * @param {string} eanCode
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findByEanCode(eanCode) {
    return SKUModel.findOne({ eanCode }).lean();
  }

  /**
   * Finds all active/matching SKUs that contain an alias for the given external code
   * and optional vendorGstin.
   *
   * @param {string} code - The external alias code string.
   * @param {string|null} [vendorGstin=null] - Optional vendor GSTIN string.
   * @returns {Promise<import('mongoose').Document[]>} Array of matching SKU documents.
   */
  async findByAlias(code, vendorGstin = null) {
    if (!code || typeof code !== 'string') return [];
    const normalisedCode = code.trim().toUpperCase();
    if (!normalisedCode) return [];

    const normalisedGstin = typeof vendorGstin === 'string' && vendorGstin.trim().length > 0
      ? vendorGstin.trim().toUpperCase()
      : null;

    if (normalisedGstin) {
      // Query vendor-specific alias first
      const vendorMatches = await SKUModel.find({
        aliases: {
          $elemMatch: {
            code: normalisedCode,
            vendorGstin: normalisedGstin,
          },
        },
      }).lean();

      if (vendorMatches.length > 0) {
        return vendorMatches;
      }
    }

    // Fall back to global alias lookup (vendorGstin is null)
    return SKUModel.find({
      aliases: {
        $elemMatch: {
          code: normalisedCode,
          vendorGstin: null,
        },
      },
    }).lean();
  }

  /**
   * Finds a single SKU by its MongoDB `_id`.
   * @param {string} id - MongoDB ObjectId string.
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async findById(id) {
    return SKUModel.findById(id).lean();
  }

  /**
   * Returns all SKUs matching the given filter.
   * @param {Object}  [filter={}]
   * @param {Object}  [options={}]
   * @param {number}  [options.limit=100]
   * @param {number}  [options.skip=0]
   * @param {Object}  [options.sort]
   * @param {string}  [options.projection]
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findMany(filter = {}, { limit = 100, skip = 0, sort = { skuCode: 1 }, projection } = {}) {
    return SKUModel
      .find(filter, projection)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean();
  }

  /**
   * Returns only active SKUs (`isActive: true`).
   * @param {Object}  [options={}] - Forwarded to findMany.
   * @returns {Promise<import('mongoose').Document[]>}
   */
  async findActive(options = {}) {
    return this.findMany({ isActive: true }, options);
  }

  /**
   * Counts documents matching the given filter.
   * @param {Object} [filter={}]
   * @returns {Promise<number>}
   */
  async count(filter = {}) {
    return SKUModel.countDocuments(filter);
  }

  // ── Update ──────────────────────────────────────────────────────────────────

  /**
   * Applies a partial update to a SKU identified by `skuCode`.
   * @param {string} skuCode
   * @param {Object} updates - Fields to update (merged with $set).
   * @returns {Promise<import('mongoose').Document|null>} The updated document.
   */
  async updateBySkuCode(skuCode, updates) {
    return SKUModel.findOneAndUpdate(
      { skuCode },
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  /**
   * Applies a partial update to a SKU identified by MongoDB `_id`.
   * @param {string} id
   * @param {Object} updates
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async updateById(id, updates) {
    return SKUModel.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).lean();
  }

  // ── Delete ──────────────────────────────────────────────────────────────────

  /**
   * Permanently removes a SKU by `skuCode`.
   * @param {string} skuCode
   * @returns {Promise<import('mongoose').Document|null>} The deleted document.
   */
  async deleteBySkuCode(skuCode) {
    return SKUModel.findOneAndDelete({ skuCode }).lean();
  }

  /**
   * Permanently removes a SKU by MongoDB `_id`.
   * @param {string} id
   * @returns {Promise<import('mongoose').Document|null>}
   */
  async deleteById(id) {
    return SKUModel.findByIdAndDelete(id).lean();
  }
}

module.exports = SKURepository;

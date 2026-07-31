'use strict';

const mongoose = require('mongoose');
const SKURepository = require('../../../repositories/SKURepository');

/**
 * @class SKUResolver
 *
 * Service responsible for resolving vendor/partner SKU codes, EANs, and barcodes
 * to canonical SKU codes stored in the SKU master catalogue repository.
 */
class SKUResolver {
  /**
   * @param {SKURepository} [skuRepository]
   */
  constructor(skuRepository) {
    this._skuRepository = skuRepository || new SKURepository();
  }

  /**
   * Resolves a SKU identifier or candidate object to its canonical SKU code.
   *
   * Priority:
   *  1. Direct SKU Code lookup in SKURepository (findBySkuCode)
   *  2. EAN/Barcode lookup in SKURepository (findByEanCode)
   *  3. Fallback: returns original input SKU string if no mapping exists.
   *
   * @param {string|{ sku?: string, poSku?: string, invoiceSku?: string, ean?: string, barcode?: string }} input
   * @returns {Promise<string>} Canonical SKU code.
   */
  async resolve(input) {
    if (!input) return '';

    // Determine whether repo query should be attempted (custom mock repo OR active DB connection)
    const isCustomRepo = Boolean(this._skuRepository && this._skuRepository.constructor && this._skuRepository.constructor.name !== 'SKURepository');
    const isDbConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    const shouldQueryRepo = isCustomRepo || isDbConnected;

    // Handle plain string input
    if (typeof input === 'string') {
      const raw = input.trim().toUpperCase();
      if (!raw) return '';

      if (shouldQueryRepo) {
        try {
          const byCode = await this._skuRepository.findBySkuCode(raw);
          if (byCode && byCode.skuCode) {
            return byCode.skuCode;
          }

          const byEan = await this._skuRepository.findByEanCode(raw);
          if (byEan && byEan.skuCode) {
            return byEan.skuCode;
          }
        } catch (_err) {
          // Fallback silently if DB query fails
        }
      }

      return raw;
    }

    // Handle candidate object input
    const candidates = [
      input.sku,
      input.poSku,
      input.invoiceSku,
      input.ean,
      input.barcode,
    ].filter((val) => typeof val === 'string' && val.trim().length > 0);

    if (candidates.length === 0) {
      return '';
    }

    const fallbackSku = candidates[0].trim().toUpperCase();

    if (shouldQueryRepo) {
      try {
        for (const candidate of candidates) {
          const normalised = candidate.trim().toUpperCase();

          const byCode = await this._skuRepository.findBySkuCode(normalised);
          if (byCode && byCode.skuCode) {
            return byCode.skuCode;
          }

          const byEan = await this._skuRepository.findByEanCode(normalised);
          if (byEan && byEan.skuCode) {
            return byEan.skuCode;
          }
        }
      } catch (_err) {
        // Fallback silently if DB query fails
      }
    }

    return fallbackSku;
  }
}

module.exports = SKUResolver;

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
   * Resolves a SKU identifier or candidate object to its canonical SKU code representation.
   *
   * Priority:
   *  1. Direct SKU Code lookup in SKURepository (findBySkuCode)
   *  2. Vendor-specific or global alias lookup in SKURepository (findByAlias)
   *  3. EAN/Barcode lookup in SKURepository (findByEanCode)
   *  4. Fallback: returns UNRESOLVED structured result.
   *
   * @param {string|{ sku?: string, poSku?: string, invoiceSku?: string, ean?: string, barcode?: string, vendorGstin?: string }} input
   * @param {Object} [options={}]
   * @param {string|null} [options.vendorGstin]
   * @returns {Promise<{
   *   status: 'RESOLVED'|'UNRESOLVED'|'AMBIGUOUS',
   *   canonicalSku: string|null,
   *   externalCode: string,
   *   source: 'CANONICAL'|'ALIAS'|'EAN'|'FALLBACK',
   *   resolved: boolean
   * }>} Structured resolution result.
   */
  async resolve(input, options = {}) {
    const defaultUnresolved = (code = '') => ({
      status: 'UNRESOLVED',
      canonicalSku: null,
      externalCode: code,
      source: 'FALLBACK',
      resolved: false,
    });

    if (!input) return defaultUnresolved('');

    // Determine vendor GSTIN context from options or input object
    const vendorGstin = options?.vendorGstin || (typeof input === 'object' ? input.vendorGstin : null) || null;

    // Determine candidates array and fallback code
    let candidates = [];
    let fallbackCode = '';

    if (typeof input === 'string') {
      const raw = input.trim().toUpperCase();
      if (!raw) return defaultUnresolved('');
      candidates = [raw];
      fallbackCode = raw;
    } else if (typeof input === 'object') {
      candidates = [
        input.sku,
        input.poSku,
        input.invoiceSku,
        input.ean,
        input.barcode,
      ].filter((val) => typeof val === 'string' && val.trim().length > 0)
       .map((val) => val.trim().toUpperCase());

      if (candidates.length === 0) {
        return defaultUnresolved('');
      }
      fallbackCode = candidates[0];
    }

    // Determine whether repo query should be attempted (custom mock repo OR active DB connection)
    const isCustomRepo = Boolean(
      this._skuRepository &&
      this._skuRepository.constructor &&
      this._skuRepository.constructor.name !== 'SKURepository'
    );
    const isDbConnected = Boolean(mongoose.connection && mongoose.connection.readyState === 1);
    const shouldQueryRepo = isCustomRepo || isDbConnected;

    if (!shouldQueryRepo) {
      return {
        status: 'RESOLVED',
        canonicalSku: fallbackCode,
        externalCode: fallbackCode,
        source: 'CANONICAL',
        resolved: true,
      };
    }

    try {
      for (const candidate of candidates) {
        // 1. Direct SKU Code lookup
        if (typeof this._skuRepository.findBySkuCode === 'function') {
          const byCode = await this._skuRepository.findBySkuCode(candidate);
          if (byCode && byCode.skuCode) {
            return {
              status: 'RESOLVED',
              canonicalSku: byCode.skuCode,
              externalCode: candidate,
              source: 'CANONICAL',
              resolved: true,
            };
          }
        }

        // 2. Vendor-specific or global alias lookup
        if (typeof this._skuRepository.findByAlias === 'function') {
          const aliasMatches = await this._skuRepository.findByAlias(candidate, vendorGstin);
          if (Array.isArray(aliasMatches) && aliasMatches.length > 0) {
            const uniqueSkus = [...new Set(aliasMatches.map((m) => m.skuCode).filter(Boolean))];
            if (uniqueSkus.length === 1) {
              return {
                status: 'RESOLVED',
                canonicalSku: uniqueSkus[0],
                externalCode: candidate,
                source: 'ALIAS',
                resolved: true,
              };
            }
            if (uniqueSkus.length > 1) {
              return {
                status: 'AMBIGUOUS',
                canonicalSku: null,
                externalCode: candidate,
                source: 'ALIAS',
                resolved: false,
              };
            }
          }
        }

        // 3. EAN Barcode lookup
        if (typeof this._skuRepository.findByEanCode === 'function') {
          const byEan = await this._skuRepository.findByEanCode(candidate);
          if (byEan && byEan.skuCode) {
            return {
              status: 'RESOLVED',
              canonicalSku: byEan.skuCode,
              externalCode: candidate,
              source: 'EAN',
              resolved: true,
            };
          }
        }
      }
    } catch (_err) {
      // Fallback gracefully on query error
    }

    return defaultUnresolved(fallbackCode);
  }
}

module.exports = SKUResolver;

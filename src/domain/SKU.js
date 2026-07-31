'use strict';

/**
 * @class SKU
 *
 * Entity representing a Stock Keeping Unit (SKU) in the product catalogue.
 *
 * Identity: `skuCode` — frozen and immutable after construction.
 *
 * Exposes price-tolerance logic used by the three-way matching engine to
 * determine whether an invoiced unit rate is acceptable relative to the
 * agreed catalogue price.
 *
 * @typedef {Object} SKUData
 * @property {string} skuCode          - Unique SKU identifier.
 * @property {string} description      - Human-readable product name.
 * @property {number} unitPrice        - Agreed catalogue unit price.
 * @property {number} [priceTolerance] - Allowed ± deviation as a decimal fraction (default 0.05 = 5 %).
 * @property {string} [unit]           - Unit of measure (e.g. 'EACH', 'KG', 'BOX').
 */
class SKU {
  /** Default tolerance of 5 % if none is provided. */
  static DEFAULT_PRICE_TOLERANCE = 0.05;

  /**
   * @param {SKUData} data
   */
  constructor({ skuCode, description, unitPrice, priceTolerance, unit }) {
    if (!skuCode || typeof skuCode !== 'string') {
      throw new TypeError('SKU: skuCode must be a non-empty string');
    }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) {
      throw new TypeError('SKU: unitPrice must be a non-negative number');
    }
    if (priceTolerance !== undefined && (!Number.isFinite(priceTolerance) || priceTolerance < 0 || priceTolerance > 1)) {
      throw new TypeError('SKU: priceTolerance must be a decimal fraction between 0 and 1');
    }

    // Immutable identity
    this._skuCode = Object.freeze(skuCode.trim().toUpperCase());

    this._description    = description ?? '';
    this._unitPrice      = unitPrice;
    this._priceTolerance = priceTolerance ?? SKU.DEFAULT_PRICE_TOLERANCE;
    this._unit           = unit ?? 'EACH';
  }

  // ── Identifiers ────────────────────────────────────────────────────────────

  /** @returns {string} Unique SKU code. */
  get skuCode() { return this._skuCode; }

  // ── Attribute getters ──────────────────────────────────────────────────────

  /** @returns {string} */
  get description() { return this._description; }

  /** @returns {number} Agreed catalogue unit price. */
  get unitPrice() { return this._unitPrice; }

  /**
   * Allowed price deviation expressed as a fraction (e.g. 0.05 = 5 %).
   * @returns {number}
   */
  get priceTolerance() { return this._priceTolerance; }

  /** @returns {string} Unit of measure. */
  get unit() { return this._unit; }

  // ── Business methods ───────────────────────────────────────────────────────

  /**
   * Determines whether an invoiced unit rate falls within the agreed
   * price tolerance band of the catalogue unit price.
   *
   * Tolerance band:
   *   lower = unitPrice × (1 − priceTolerance)
   *   upper = unitPrice × (1 + priceTolerance)
   *
   * @example
   *   // unitPrice = 10.00, priceTolerance = 0.05
   *   sku.isWithinPriceTolerance(9.50)  // true  — within 5 %
   *   sku.isWithinPriceTolerance(10.60) // false — exceeds upper bound
   *
   * @param {number} rate - The unit price to evaluate (e.g. from an Invoice line item).
   * @returns {boolean}
   */
  isWithinPriceTolerance(rate) {
    if (!Number.isFinite(rate) || rate < 0) {
      throw new TypeError('SKU.isWithinPriceTolerance: rate must be a non-negative number');
    }

    const lower = this._unitPrice * (1 - this._priceTolerance);
    const upper = this._unitPrice * (1 + this._priceTolerance);

    return rate >= lower && rate <= upper;
  }

  /**
   * Returns the absolute maximum price deviation allowed.
   * @returns {number}
   */
  toleranceAmount() {
    return this._unitPrice * this._priceTolerance;
  }

  /**
   * Returns the lower and upper bounds of the acceptable price band.
   * @returns {{ lower: number, upper: number }}
   */
  priceBand() {
    return {
      lower: this._unitPrice * (1 - this._priceTolerance),
      upper: this._unitPrice * (1 + this._priceTolerance),
    };
  }

  /** @returns {Object} */
  toJSON() {
    return {
      skuCode:        this._skuCode,
      description:    this._description,
      unitPrice:      this._unitPrice,
      priceTolerance: this._priceTolerance,
      unit:           this._unit,
    };
  }
}

module.exports = SKU;

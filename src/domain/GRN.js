'use strict';

/**
 * @class GRNLineItem
 *
 * Value Object representing a single received-goods line on a GRN.
 * Immutable by design — every field is frozen after construction.
 *
 * @typedef {Object} GRNLineItemData
 * @property {number}      lineNumber
 * @property {string}      sku
 * @property {number}      orderedQuantity
 * @property {number}      receivedQuantity
 * @property {number}      [rejectedQuantity]
 * @property {string|null} [rejectionReason]
 */
class GRNLineItem {
  /**
   * @param {GRNLineItemData} data
   */
  constructor({ lineNumber, sku, orderedQuantity, receivedQuantity, rejectedQuantity = 0, rejectionReason = null }) {
    if (!sku || typeof sku !== 'string') throw new TypeError('GRNLineItem: sku must be a non-empty string');
    if (!Number.isFinite(orderedQuantity)  || orderedQuantity  < 0) throw new TypeError('GRNLineItem: orderedQuantity must be a non-negative number');
    if (!Number.isFinite(receivedQuantity) || receivedQuantity < 0) throw new TypeError('GRNLineItem: receivedQuantity must be a non-negative number');

    this._lineNumber       = lineNumber;
    this._sku              = sku.trim().toUpperCase();
    this._orderedQuantity  = orderedQuantity;
    this._receivedQuantity = receivedQuantity;
    this._rejectedQuantity = rejectedQuantity;
    this._rejectionReason  = rejectionReason;

    Object.freeze(this);
  }

  get lineNumber()       { return this._lineNumber; }
  get sku()              { return this._sku; }
  get orderedQuantity()  { return this._orderedQuantity; }
  get receivedQuantity() { return this._receivedQuantity; }
  get rejectedQuantity() { return this._rejectedQuantity; }
  get rejectionReason()  { return this._rejectionReason; }

  /**
   * Whether this line item had any goods rejected.
   * @returns {boolean}
   */
  hasRejections() {
    return this._rejectedQuantity > 0;
  }

  /**
   * Ratio of received to ordered quantity (0–1).
   * Returns 0 when orderedQuantity is 0 to avoid division by zero.
   * @returns {number}
   */
  acceptanceRate() {
    if (this._orderedQuantity === 0) return 0;
    return this._receivedQuantity / this._orderedQuantity;
  }

  /** @returns {Object} */
  toJSON() {
    return {
      lineNumber:       this._lineNumber,
      sku:              this._sku,
      orderedQuantity:  this._orderedQuantity,
      receivedQuantity: this._receivedQuantity,
      rejectedQuantity: this._rejectedQuantity,
      rejectionReason:  this._rejectionReason,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class GRN
 *
 * Aggregate Root representing a Goods Received Note (GRN).
 *
 * Identity: `grnNumber` — frozen and immutable after construction.
 * Captures what was physically received against a Purchase Order reference
 * and exposes query methods used by the three-way matching engine.
 *
 * @typedef {Object} GRNData
 * @property {string}           grnNumber
 * @property {string}           poReference
 * @property {string}           receivedDate
 * @property {string}           warehouse
 * @property {string}           receivedBy
 * @property {GRNLineItemData[]} lineItems
 */
class GRN {
  /**
   * @param {GRNData} data
   */
  constructor({ grnNumber, poReference, receivedDate, warehouse, receivedBy, lineItems }) {
    if (!grnNumber || typeof grnNumber !== 'string') {
      throw new TypeError('GRN: grnNumber must be a non-empty string');
    }
    if (!poReference || typeof poReference !== 'string') {
      throw new TypeError('GRN: poReference must be a non-empty string');
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new TypeError('GRN: lineItems must be a non-empty array');
    }

    // Immutable identity
    this._grnNumber    = Object.freeze(grnNumber.trim());
    this._poReference  = Object.freeze(poReference.trim());

    this._receivedDate = receivedDate ? new Date(receivedDate) : null;
    this._warehouse    = warehouse ?? '';
    this._receivedBy   = receivedBy ?? '';
    this._lineItems    = Object.freeze(lineItems.map((item) => new GRNLineItem(item)));
  }

  // ── Identifiers ────────────────────────────────────────────────────────────

  /** @returns {string} Unique GRN number. */
  get grnNumber() { return this._grnNumber; }

  // ── Attribute getters ──────────────────────────────────────────────────────

  /** @returns {string} Reference to the originating PO. */
  get poReference() { return this._poReference; }

  /** @returns {Date|null} */
  get receivedDate() { return this._receivedDate; }

  /** @returns {string} */
  get warehouse() { return this._warehouse; }

  /** @returns {string} */
  get receivedBy() { return this._receivedBy; }

  // ── Business methods ───────────────────────────────────────────────────────

  /**
   * Returns a shallow copy of the line-item collection.
   * @returns {GRNLineItem[]}
   */
  getItems() {
    return [...this._lineItems];
  }

  /**
   * Finds a received line item by SKU (case-insensitive).
   * @param {string} sku
   * @returns {GRNLineItem|undefined}
   */
  getItemBySku(sku) {
    if (!sku || typeof sku !== 'string') return undefined;
    const normalised = sku.trim().toUpperCase();
    return this._lineItems.find((item) => item.sku === normalised);
  }

  /**
   * Sum of all `receivedQuantity` values across every line item.
   * Used by the matching engine to compare against PO and Invoice totals.
   * @returns {number}
   */
  totalReceivedQuantity() {
    return this._lineItems.reduce((sum, item) => sum + item.receivedQuantity, 0);
  }

  /**
   * Sum of all `rejectedQuantity` values across every line item.
   * @returns {number}
   */
  totalRejectedQuantity() {
    return this._lineItems.reduce((sum, item) => sum + item.rejectedQuantity, 0);
  }

  /**
   * Returns only the line items that had partial or full rejection.
   * @returns {GRNLineItem[]}
   */
  getRejectedItems() {
    return this._lineItems.filter((item) => item.hasRejections());
  }

  /** @returns {Object} */
  toJSON() {
    return {
      grnNumber:    this._grnNumber,
      poReference:  this._poReference,
      receivedDate: this._receivedDate?.toISOString() ?? null,
      warehouse:    this._warehouse,
      receivedBy:   this._receivedBy,
      lineItems:    this._lineItems.map((i) => i.toJSON()),
    };
  }
}

module.exports = GRN;

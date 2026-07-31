'use strict';

/**
 * @class LineItem
 *
 * Value Object representing a single line on a Purchase Order.
 * Immutable by design — every field is frozen after construction.
 *
 * @typedef {Object} LineItemData
 * @property {number} lineNumber
 * @property {string} sku
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 */
class LineItem {
  /**
   * @param {LineItemData} data
   */
  constructor({ lineNumber, sku, description, quantity, unitPrice, totalPrice }) {
    if (!sku || typeof sku !== 'string') throw new TypeError('LineItem: sku must be a non-empty string');
    if (!Number.isFinite(quantity) || quantity <= 0) throw new TypeError('LineItem: quantity must be a positive number');
    if (!Number.isFinite(unitPrice) || unitPrice < 0) throw new TypeError('LineItem: unitPrice must be a non-negative number');

    this._lineNumber  = lineNumber;
    this._sku         = sku.trim().toUpperCase();
    this._description = description ?? '';
    this._quantity    = quantity;
    this._unitPrice   = unitPrice;
    this._totalPrice  = totalPrice ?? quantity * unitPrice;

    Object.freeze(this);
  }

  get lineNumber()  { return this._lineNumber; }
  get sku()         { return this._sku; }
  get description() { return this._description; }
  get quantity()    { return this._quantity; }
  get unitPrice()   { return this._unitPrice; }
  get totalPrice()  { return this._totalPrice; }

  /** Returns a plain-object snapshot — safe to serialise. */
  toJSON() {
    return {
      lineNumber:  this._lineNumber,
      sku:         this._sku,
      description: this._description,
      quantity:    this._quantity,
      unitPrice:   this._unitPrice,
      totalPrice:  this._totalPrice,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────

/**
 * @class PurchaseOrder
 *
 * Aggregate Root representing a commercial Purchase Order.
 *
 * Identity: `poNumber` — frozen and immutable after construction.
 * Encapsulates line items as `LineItem` value objects and exposes only
 * intentional accessors, never the raw internal collection.
 *
 * @typedef {Object} PurchaseOrderData
 * @property {string}     poNumber
 * @property {string}     issueDate
 * @property {string}     currency
 * @property {Object}     buyer
 * @property {Object}     supplier
 * @property {LineItemData[]} lineItems
 * @property {number}     totalAmount
 * @property {string}     [paymentTerms]
 */
class PurchaseOrder {
  /**
   * @param {PurchaseOrderData} data
   */
  constructor({ poNumber, issueDate, currency, buyer, supplier, lineItems, totalAmount, paymentTerms }) {
    if (!poNumber || typeof poNumber !== 'string') {
      throw new TypeError('PurchaseOrder: poNumber must be a non-empty string');
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new TypeError('PurchaseOrder: lineItems must be a non-empty array');
    }

    // Immutable identity — frozen once set
    this._poNumber = Object.freeze(poNumber.trim());

    this._issueDate    = issueDate ? new Date(issueDate) : null;
    this._currency     = (currency ?? 'INR').trim().toUpperCase();
    this._buyer        = Object.freeze({ ...buyer });
    this._supplier     = Object.freeze({ ...supplier });
    this._lineItems    = Object.freeze(lineItems.map((item) => new LineItem(item)));
    this._totalAmount  = totalAmount ?? 0;
    this._paymentTerms = paymentTerms ?? null;
  }

  // ── Identifiers ────────────────────────────────────────────────────────────

  /** @returns {string} Unique Purchase Order number. */
  get poNumber() { return this._poNumber; }

  // ── Attribute getters ──────────────────────────────────────────────────────

  /** @returns {Date|null} */
  get issueDate() { return this._issueDate; }

  /** @returns {string} ISO 4217 currency code. */
  get currency() { return this._currency; }

  /** @returns {Readonly<Object>} Buyer details. */
  get buyer() { return this._buyer; }

  /** @returns {Readonly<Object>} Supplier details. */
  get supplier() { return this._supplier; }

  /** @returns {number} Grand total of this order. */
  get totalAmount() { return this._totalAmount; }

  /** @returns {string|null} */
  get paymentTerms() { return this._paymentTerms; }

  // ── Business methods ───────────────────────────────────────────────────────

  /**
   * Returns a shallow copy of the line-item collection.
   * Never exposes the internal frozen array directly.
   * @returns {LineItem[]}
   */
  getItems() {
    return [...this._lineItems];
  }

  /**
   * Finds a line item by SKU (case-insensitive).
   * @param {string} sku
   * @returns {LineItem|undefined}
   */
  getItemBySku(sku) {
    if (!sku || typeof sku !== 'string') return undefined;
    const normalised = sku.trim().toUpperCase();
    return this._lineItems.find((item) => item.sku === normalised);
  }

  /**
   * Total number of distinct line items on this order.
   * @returns {number}
   */
  totalItems() {
    return this._lineItems.length;
  }

  /**
   * Sum of ordered quantities across all line items.
   * @returns {number}
   */
  totalOrderedQuantity() {
    return this._lineItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Checks whether this PO references the given supplier by taxId.
   * @param {string} taxId
   * @returns {boolean}
   */
  isFromSupplier(taxId) {
    return this._supplier.taxId === taxId;
  }

  /** @returns {Object} Plain-object snapshot safe for serialisation. */
  toJSON() {
    return {
      poNumber:     this._poNumber,
      issueDate:    this._issueDate?.toISOString() ?? null,
      currency:     this._currency,
      buyer:        this._buyer,
      supplier:     this._supplier,
      lineItems:    this._lineItems.map((i) => i.toJSON()),
      totalAmount:  this._totalAmount,
      paymentTerms: this._paymentTerms,
    };
  }
}

module.exports = PurchaseOrder;

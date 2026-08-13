'use strict';

/**
 * @class InvoiceLineItem
 *
 * Value Object representing a single billed line on an Invoice.
 * Immutable by design — every field is frozen after construction.
 *
 * @typedef {Object} InvoiceLineItemData
 * @property {number} lineNumber
 * @property {string} sku
 * @property {string} description
 * @property {number} quantity
 * @property {number} unitPrice
 * @property {number} totalPrice
 */
class InvoiceLineItem {
  /**
   * @param {InvoiceLineItemData} data
   */
  constructor({ lineNumber, sku, description, quantity, unitPrice, totalPrice }) {
    if (!sku || typeof sku !== 'string') throw new TypeError('InvoiceLineItem: sku must be a non-empty string');
    if (!Number.isFinite(quantity)   || quantity   <= 0) throw new TypeError('InvoiceLineItem: quantity must be a positive number');
    if (!Number.isFinite(unitPrice)  || unitPrice  <  0) throw new TypeError('InvoiceLineItem: unitPrice must be a non-negative number');
    if (!Number.isFinite(totalPrice) || totalPrice <  0) throw new TypeError('InvoiceLineItem: totalPrice must be a non-negative number');

    this._lineNumber  = lineNumber;
    this._sku         = sku.trim().toUpperCase();
    this._description = description ?? '';
    this._quantity    = quantity;
    this._unitPrice   = unitPrice;
    this._totalPrice  = totalPrice;

    Object.freeze(this);
  }

  get lineNumber()  { return this._lineNumber; }
  get sku()         { return this._sku; }
  get description() { return this._description; }
  get quantity()    { return this._quantity; }
  get unitPrice()   { return this._unitPrice; }
  get totalPrice()  { return this._totalPrice; }

  /** @returns {Object} */
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
 * @class Invoice
 *
 * Aggregate Root representing a supplier Invoice.
 *
 * Identity: `invoiceNumber` — frozen and immutable after construction.
 * Captures what a supplier is billing for and exposes query methods
 * used by the three-way matching engine to cross-reference with PO and GRN.
 *
 * @typedef {Object} InvoiceData
 * @property {string}               invoiceNumber
 * @property {string}               poReference
 * @property {string}               grnReference
 * @property {string}               issueDate
 * @property {string}               dueDate
 * @property {string}               currency
 * @property {Object}               supplier
 * @property {InvoiceLineItemData[]} lineItems
 * @property {number}               subtotal
 * @property {number}               [taxAmount]
 * @property {number}               totalAmount
 */
class Invoice {
  /**
   * @param {InvoiceData} data
   */
  constructor({ invoiceNumber, poReference, grnReference, issueDate, dueDate, currency, supplier, lineItems, subtotal, taxAmount = 0, totalAmount }) {
    if (!invoiceNumber || typeof invoiceNumber !== 'string') {
      throw new TypeError('Invoice: invoiceNumber must be a non-empty string');
    }
    if (!poReference || typeof poReference !== 'string') {
      throw new TypeError('Invoice: poReference must be a non-empty string');
    }
    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      throw new TypeError('Invoice: lineItems must be a non-empty array');
    }

    // Immutable identity
    this._invoiceNumber = Object.freeze(invoiceNumber.trim());
    this._poReference   = Object.freeze(poReference.trim());
    this._grnReference  = grnReference ? Object.freeze(grnReference.trim()) : null;

    this._issueDate   = issueDate ? new Date(issueDate) : null;
    this._dueDate     = dueDate   ? new Date(dueDate)   : null;
    this._currency    = (currency ?? 'INR').trim().toUpperCase();
    this._supplier    = Object.freeze({ ...supplier });
    this._lineItems   = Object.freeze(lineItems.map((item) => new InvoiceLineItem(item)));
    this._subtotal    = subtotal    ?? 0;
    this._taxAmount   = taxAmount   ?? 0;
    this._totalAmount = totalAmount ?? 0;
  }

  // ── Identifiers ────────────────────────────────────────────────────────────

  /** @returns {string} Unique Invoice number. */
  get invoiceNumber() { return this._invoiceNumber; }

  // ── Attribute getters ──────────────────────────────────────────────────────

  /** @returns {string} Reference to the originating PO. */
  get poReference()  { return this._poReference; }

  /** @returns {string|null} Reference to the confirming GRN. */
  get grnReference() { return this._grnReference; }

  /** @returns {Date|null} */
  get issueDate()    { return this._issueDate; }

  /** @returns {Date|null} */
  get dueDate()      { return this._dueDate; }

  /** @returns {string} ISO 4217 currency code. */
  get currency()     { return this._currency; }

  /** @returns {Readonly<Object>} Supplier details. */
  get supplier()     { return this._supplier; }

  /** @returns {number} */
  get subtotal()     { return this._subtotal; }

  /** @returns {number} */
  get taxAmount()    { return this._taxAmount; }

  /** @returns {number} */
  get totalAmount()  { return this._totalAmount; }

  // ── Business methods ───────────────────────────────────────────────────────

  /**
   * Returns a shallow copy of the line-item collection.
   * @returns {InvoiceLineItem[]}
   */
  getItems() {
    return [...this._lineItems];
  }

  /**
   * Finds an invoiced line item by SKU (case-insensitive).
   * @param {string} sku
   * @returns {InvoiceLineItem|undefined}
   */
  getItemBySku(sku) {
    if (!sku || typeof sku !== 'string') return undefined;
    const normalised = sku.trim().toUpperCase();
    return this._lineItems.find((item) => item.sku === normalised);
  }

  /**
   * Sum of all billed `quantity` values across every line item.
   * Used by the matching engine to compare against PO ordered and GRN received quantities.
   * @returns {number}
   */
  totalInvoiceQuantity() {
    return this._lineItems.reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Checks whether this invoice is overdue relative to a reference date.
   * @param {Date} [referenceDate=new Date()] - Defaults to today.
   * @returns {boolean}
   */
  isOverdue(referenceDate = new Date()) {
    if (!this._dueDate) return false;
    return referenceDate > this._dueDate;
  }

  /** @returns {Object} */
  toJSON() {
    const safeISO = (d) => (d instanceof Date && !isNaN(d.getTime()) ? d.toISOString() : null);
    return {
      invoiceNumber: this._invoiceNumber,
      poReference:   this._poReference,
      grnReference:  this._grnReference,
      issueDate:     safeISO(this._issueDate),
      dueDate:       safeISO(this._dueDate),
      currency:      this._currency,
      supplier:      {
        ...this._supplier,
        gstin: this._supplier.gstin || this._supplier.taxId || '',
        taxId: this._supplier.taxId || this._supplier.gstin || '',
      },
      lineItems:     this._lineItems.map((i) => i.toJSON()),
      subtotal:      this._subtotal,
      taxAmount:     this._taxAmount,
      totalAmount:   this._totalAmount,
    };
  }
}

module.exports = Invoice;

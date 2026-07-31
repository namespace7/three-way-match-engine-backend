'use strict';

/**
 * @class DocumentValidator
 *
 * Validates canonical domain objects produced by DocumentMapper against
 * business rules before they are persisted or forwarded downstream.
 *
 * @typedef {Object} ValidationResult
 * @property {boolean}  valid  - True when all rules pass.
 * @property {string[]} errors - Human-readable list of violations.
 */
class DocumentValidator {
  /**
   * Validates a canonical PurchaseOrder domain object.
   *
   * @param {Object} purchaseOrder
   * @returns {ValidationResult}
   */
  validatePurchaseOrder(purchaseOrder) {
    const errors = [];
    if (!purchaseOrder) {
      return { valid: false, errors: ['PurchaseOrder object is missing'] };
    }

    const poNumber = purchaseOrder.poNumber || purchaseOrder._poNumber;
    if (!poNumber) {
      errors.push('poNumber is required');
    }

    const lineItems = typeof purchaseOrder.getItems === 'function'
      ? purchaseOrder.getItems()
      : purchaseOrder.lineItems;

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      errors.push('lineItems must be a non-empty array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a canonical GRN domain object.
   *
   * @param {Object} grn
   * @returns {ValidationResult}
   */
  validateGRN(grn) {
    const errors = [];
    if (!grn) {
      return { valid: false, errors: ['GRN object is missing'] };
    }

    const grnNumber = grn.grnNumber || grn._grnNumber;
    if (!grnNumber) {
      errors.push('grnNumber is required');
    }

    const poReference = grn.poReference || grn._poReference;
    if (!poReference) {
      errors.push('poReference is required');
    }

    const lineItems = typeof grn.getItems === 'function'
      ? grn.getItems()
      : grn.lineItems;

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      errors.push('lineItems must be a non-empty array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validates a canonical Invoice domain object.
   *
   * @param {Object} invoice
   * @returns {ValidationResult}
   */
  validateInvoice(invoice) {
    const errors = [];
    if (!invoice) {
      return { valid: false, errors: ['Invoice object is missing'] };
    }

    const invoiceNumber = invoice.invoiceNumber || invoice._invoiceNumber;
    if (!invoiceNumber) {
      errors.push('invoiceNumber is required');
    }

    const poReference = invoice.poReference || invoice._poReference;
    if (!poReference) {
      errors.push('poReference is required');
    }

    const lineItems = typeof invoice.getItems === 'function'
      ? invoice.getItems()
      : invoice.lineItems;

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      errors.push('lineItems must be a non-empty array');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}

module.exports = DocumentValidator;

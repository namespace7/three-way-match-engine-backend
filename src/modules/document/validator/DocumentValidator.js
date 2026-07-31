'use strict';

/**
 * @class DocumentValidator
 *
 * Validates canonical domain objects produced by DocumentMapper against
 * business rules before they are persisted or forwarded downstream.
 *
 * Each method returns a validation result object rather than throwing, so
 * the service layer can aggregate errors across multiple document types and
 * report them in a single response.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : owns only the validation concern; no mapping,
 *                            no persistence, no HTTP.
 *  - Open/Closed           : add rules by extending or composing; never patch
 *                            existing validate methods.
 *  - Interface Segregation : callers may import only the method they need.
 *
 * @typedef  {Object} ValidationResult
 * @property {boolean}  valid  - True when all rules pass.
 * @property {string[]} errors - Human-readable list of violations (empty when valid).
 */
class DocumentValidator {
  /**
   * Validates a canonical PurchaseOrder domain object.
   *
   * @param {Record<string, unknown>} purchaseOrder - Output of DocumentMapper#mapPurchaseOrder.
   * @returns {ValidationResult}
   */
  validatePurchaseOrder(purchaseOrder) { // eslint-disable-line no-unused-vars
    // TODO: Assert purchaseOrder is a non-null object
    // TODO: Validate poNumber is a non-empty string
    // TODO: Validate issueDate is a valid Date and not in the future
    // TODO: Validate buyer.name and buyer.taxId are present
    // TODO: Validate supplier.name and supplier.taxId are present
    // TODO: Validate lineItems is a non-empty array
    // TODO: Per line item — assert sku, quantity > 0, unitPrice > 0, totalPrice matches quantity * unitPrice
    // TODO: Validate totalAmount matches sum of line item totalPrices
    // TODO: Validate currency is a recognised ISO 4217 code
    // TODO: Return { valid: errors.length === 0, errors }
    throw new Error('Not Implemented');
  }

  /**
   * Validates a canonical GRN domain object.
   *
   * @param {Record<string, unknown>} grn - Output of DocumentMapper#mapGRN.
   * @returns {ValidationResult}
   */
  validateGRN(grn) { // eslint-disable-line no-unused-vars
    // TODO: Assert grn is a non-null object
    // TODO: Validate grnNumber is a non-empty string
    // TODO: Validate poReference matches a valid PO number format
    // TODO: Validate receivedDate is a valid Date and not in the future
    // TODO: Validate warehouse is a non-empty string
    // TODO: Validate receivedBy is a non-empty string
    // TODO: Validate lineItems is a non-empty array
    // TODO: Per line item — assert orderedQuantity > 0, receivedQuantity >= 0,
    //       rejectedQuantity >= 0, receivedQuantity + rejectedQuantity <= orderedQuantity
    // TODO: If rejectedQuantity > 0, assert rejectionReason is a non-empty string
    // TODO: Return { valid: errors.length === 0, errors }
    throw new Error('Not Implemented');
  }

  /**
   * Validates a canonical Invoice domain object.
   *
   * @param {Record<string, unknown>} invoice - Output of DocumentMapper#mapInvoice.
   * @returns {ValidationResult}
   */
  validateInvoice(invoice) { // eslint-disable-line no-unused-vars
    // TODO: Assert invoice is a non-null object
    // TODO: Validate invoiceNumber is a non-empty string
    // TODO: Validate poReference and grnReference are non-empty strings
    // TODO: Validate issueDate is a valid Date and not in the future
    // TODO: Validate dueDate is a valid Date and is after issueDate
    // TODO: Validate supplier.name, supplier.taxId, supplier.bankAccount are present
    // TODO: Validate lineItems is a non-empty array
    // TODO: Per line item — assert sku, quantity > 0, unitPrice > 0, totalPrice matches quantity * unitPrice
    // TODO: Validate subtotal matches sum of line item totalPrices
    // TODO: Validate totalAmount === subtotal + taxAmount
    // TODO: Validate currency is a recognised ISO 4217 code
    // TODO: Return { valid: errors.length === 0, errors }
    throw new Error('Not Implemented');
  }
}

module.exports = DocumentValidator;

'use strict';

/**
 * @class DocumentMapper
 *
 * Transforms raw parsed document data (output of a DocumentParser) into
 * canonical domain objects consumed by the rest of the application.
 *
 * Each method is kept pure — it receives raw data and returns a new object
 * without side effects, making it trivial to unit test in isolation.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : owns only the raw → domain mapping concern.
 *  - Open/Closed           : add new document types by extending this class
 *                            or introducing a new mapper; never modify existing maps.
 *  - Interface Segregation : individual map methods can be stubbed independently.
 */
class DocumentMapper {
  /**
   * Maps raw parsed data into a canonical PurchaseOrder domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {Record<string, unknown>} Canonical PurchaseOrder domain object.
   */
  mapPurchaseOrder(rawData) {
    // TODO: Extract and normalise buyer details from rawData.purchaseOrder.buyer
    // TODO: Extract and normalise supplier details from rawData.purchaseOrder.supplier
    // TODO: Map rawData.purchaseOrder.lineItems to canonical LineItem objects
    //       (normalise quantity, unitPrice, totalPrice to numbers)
    // TODO: Validate and parse issueDate to a Date instance
    // TODO: Map rawData.purchaseOrder.paymentTerms to a structured PaymentTerms object
    // TODO: Calculate and attach totals (subtotal, tax, grandTotal) from line items
    // TODO: Return a frozen canonical PurchaseOrder object
    throw new Error('Not Implemented');
  }

  /**
   * Maps raw parsed data into a canonical GoodsReceivedNote (GRN) domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {Record<string, unknown>} Canonical GRN domain object.
   */
  mapGRN(rawData) {
    // TODO: Extract grnNumber, poReference, receivedDate, warehouse, receivedBy
    // TODO: Map rawData.grn.lineItems to canonical GRNLineItem objects
    //       (normalise orderedQuantity, receivedQuantity, rejectedQuantity to numbers)
    // TODO: Parse receivedDate to a Date instance
    // TODO: Derive acceptance rate per line item (receivedQty / orderedQty)
    // TODO: Flag line items where rejectedQuantity > 0
    // TODO: Return a frozen canonical GRN object
    throw new Error('Not Implemented');
  }

  /**
   * Maps raw parsed data into a canonical Invoice domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {Record<string, unknown>} Canonical Invoice domain object.
   */
  mapInvoice(rawData) {
    // TODO: Extract invoiceNumber, poReference, grnReference, issueDate, dueDate
    // TODO: Extract and normalise supplier details from rawData.invoice.supplier
    // TODO: Map rawData.invoice.lineItems to canonical InvoiceLineItem objects
    //       (normalise quantity, unitPrice, totalPrice to numbers)
    // TODO: Parse issueDate and dueDate to Date instances
    // TODO: Extract subtotal, taxAmount, totalAmount
    // TODO: Derive currency from rawData.invoice.currency
    // TODO: Return a frozen canonical Invoice object
    throw new Error('Not Implemented');
  }
}

module.exports = DocumentMapper;

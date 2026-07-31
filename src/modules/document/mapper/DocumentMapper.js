'use strict';

const PurchaseOrder = require('../../../domain/PurchaseOrder');
const GRN = require('../../../domain/GRN');
const Invoice = require('../../../domain/Invoice');

/**
 * @class DocumentMapper
 *
 * Transforms raw parsed document data (output of a DocumentParser) into
 * canonical domain objects.
 */
class DocumentMapper {
  /**
   * Maps raw parsed data into a canonical PurchaseOrder domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {PurchaseOrder} Canonical PurchaseOrder domain object.
   */
  mapPurchaseOrder(rawData) {
    const data = rawData.purchaseOrder || rawData;
    return new PurchaseOrder({
      poNumber: data.poNumber,
      issueDate: data.issueDate,
      currency: data.currency,
      buyer: data.buyer,
      supplier: data.supplier,
      lineItems: data.lineItems,
      totalAmount: data.totalAmount,
      paymentTerms: data.paymentTerms,
    });
  }

  /**
   * Maps raw parsed data into a canonical GoodsReceivedNote (GRN) domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {GRN} Canonical GRN domain object.
   */
  mapGRN(rawData) {
    const data = rawData.grn || rawData;
    return new GRN({
      grnNumber: data.grnNumber,
      poReference: data.poReference,
      receivedDate: data.receivedDate,
      warehouse: data.warehouse,
      receivedBy: data.receivedBy,
      lineItems: data.lineItems,
    });
  }

  /**
   * Maps raw parsed data into a canonical Invoice domain object.
   *
   * @param {Record<string, unknown>} rawData - Raw output from a DocumentParser.
   * @returns {Invoice} Canonical Invoice domain object.
   */
  mapInvoice(rawData) {
    const data = rawData.invoice || rawData;
    return new Invoice({
      invoiceNumber: data.invoiceNumber,
      poReference: data.poReference,
      grnReference: data.grnReference,
      issueDate: data.issueDate,
      dueDate: data.dueDate,
      currency: data.currency,
      supplier: data.supplier,
      lineItems: data.lineItems,
      subtotal: data.subtotal,
      taxAmount: data.taxAmount,
      totalAmount: data.totalAmount,
    });
  }
}

module.exports = DocumentMapper;

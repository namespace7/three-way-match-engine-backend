'use strict';

const PurchaseOrderRepository = require('../../../repositories/PurchaseOrderRepository');
const GRNRepository = require('../../../repositories/GRNRepository');
const InvoiceRepository = require('../../../repositories/InvoiceRepository');

/**
 * @class DocumentAggregator
 *
 * Fetches and aggregates all documents related to a given Purchase Order from MongoDB repositories.
 *
 * Design notes:
 *  - Constructor injection for repositories.
 *  - Contains no matching or business validation logic.
 */
class DocumentAggregator {
  /**
   * @param {PurchaseOrderRepository} [poRepository]
   * @param {GRNRepository} [grnRepository]
   * @param {InvoiceRepository} [invoiceRepository]
   */
  constructor(poRepository, grnRepository, invoiceRepository) {
    this._poRepository = poRepository || new PurchaseOrderRepository();
    this._grnRepository = grnRepository || new GRNRepository();
    this._invoiceRepository = invoiceRepository || new InvoiceRepository();
  }

  /**
   * Aggregates Purchase Order, associated GRNs, and Invoices by PO number.
   *
   * @param {string} poNumber - The Purchase Order identifier.
   * @returns {Promise<{ purchaseOrder: Object|null, grns: Object[], invoices: Object[] }>}
   */
  async aggregate(poNumber) {
    if (!poNumber || typeof poNumber !== 'string') {
      throw new TypeError('DocumentAggregator.aggregate: poNumber must be a non-empty string');
    }

    const [purchaseOrder, grns, invoices] = await Promise.all([
      this._poRepository.findByPoNumber(poNumber),
      this._grnRepository.findByPoReference(poNumber),
      this._invoiceRepository.findByPoReference(poNumber),
    ]);

    return {
      purchaseOrder,
      grns,
      invoices,
    };
  }
}

module.exports = DocumentAggregator;

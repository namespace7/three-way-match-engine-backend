'use strict';

const DocumentAggregator = require('../../matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../matching/aggregator/LineItemAggregator');
const MatchingService = require('../../matching/service/MatchingService');

/**
 * @class SummaryService
 *
 * Produces summary dashboard metadata for a Purchase Order matching the assignment Summary tab specification.
 */
class SummaryService {
  constructor(documentAggregator, lineItemAggregator, matchingService) {
    this._documentAggregator = documentAggregator || new DocumentAggregator();
    this._lineItemAggregator = lineItemAggregator || new LineItemAggregator();
    this._matchingService = matchingService || new MatchingService();
  }

  /**
   * Generates PO summary stats and linked document details.
   * @param {string} poNumber
   * @returns {Promise<Object>}
   */
  async getSummary(poNumber) {
    const context = await this._documentAggregator.aggregate(poNumber);
    if (!context.purchaseOrder) {
      const error = new Error(`Purchase Order "${poNumber}" not found`);
      error.statusCode = 404;
      error.code = 'PO_NOT_FOUND';
      throw error;
    }

    const lineItems = await this._lineItemAggregator.aggregate(context);
    const matchResult = await this._matchingService.match(poNumber);

    const poAmount = context.purchaseOrder.totalAmount || 0;

    let totalOrderedQty = 0;
    let totalReceivedQty = 0;
    let totalInvoicedQty = 0;

    for (const item of lineItems) {
      totalOrderedQty += item.orderedQuantity || 0;
      totalReceivedQty += item.receivedQuantity || 0;
      totalInvoicedQty += item.invoicedQuantity || 0;
    }

    const totalInvoicedAmount = (context.invoices || []).reduce(
      (sum, inv) => sum + (inv.totalAmount || 0),
      0
    );

    const pendingDeliveryQuantity = Math.max(0, totalOrderedQty - totalReceivedQty);

    return {
      poNumber,
      poAmount,
      totalOrderedQuantity: totalOrderedQty,
      totalReceivedQuantity: totalReceivedQty,
      totalInvoicedQuantity: totalInvoicedQty,
      totalInvoicedAmount,
      pendingDeliveryQuantity,
      currentStatus: matchResult.status,
      linkedPO: context.purchaseOrder.poNumber,
      linkedGRNs: (context.grns || []).map((g) => g.grnNumber),
      linkedInvoices: (context.invoices || []).map((i) => i.invoiceNumber),
    };
  }
}

module.exports = SummaryService;

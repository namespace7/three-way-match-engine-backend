'use strict';

/**
 * @class LineItemAggregator
 *
 * Aggregates line item quantities and unit prices across Purchase Orders,
 * Goods Received Notes (GRNs), and Invoices, grouping metrics by SKU.
 */
class LineItemAggregator {
  /**
   * Aggregates line items from the provided document context grouped by SKU.
   *
   * @param {Object} [context={}]
   * @param {Object} [context.purchaseOrder]
   * @param {Array} [context.grns]
   * @param {Array} [context.invoices]
   * @returns {Array<{
   *   sku: string,
   *   orderedQuantity: number,
   *   receivedQuantity: number,
   *   invoicedQuantity: number,
   *   orderedPrice: number,
   *   invoicePrice: number
   * }>} Array of aggregated SKU entries.
   */
  aggregate(context = {}) {
    const { purchaseOrder, grns = [], invoices = [] } = context;
    const skuMap = new Map();

    /**
     * Gets or initializes an aggregation record for a given SKU.
     * @param {string} skuCode
     */
    const getOrCreateEntry = (skuCode) => {
      const normalisedSku = skuCode.trim().toUpperCase();
      if (!skuMap.has(normalisedSku)) {
        skuMap.set(normalisedSku, {
          sku: normalisedSku,
          orderedQuantity: 0,
          receivedQuantity: 0,
          invoicedQuantity: 0,
          orderedPrice: 0,
          invoicePrice: 0,
        });
      }
      return skuMap.get(normalisedSku);
    };

    // 1. Accumulate Purchase Order line items
    if (purchaseOrder) {
      const poItems = typeof purchaseOrder.getItems === 'function'
        ? purchaseOrder.getItems()
        : purchaseOrder.lineItems || [];

      for (const item of poItems) {
        if (item && item.sku) {
          const entry = getOrCreateEntry(item.sku);
          entry.orderedQuantity += item.quantity || 0;
          entry.orderedPrice = item.unitPrice || 0;
        }
      }
    }

    // 2. Accumulate GRN line items across multiple GRNs
    if (Array.isArray(grns)) {
      for (const grn of grns) {
        const grnItems = typeof grn?.getItems === 'function'
          ? grn.getItems()
          : grn?.lineItems || [];

        for (const item of grnItems) {
          if (item && item.sku) {
            const entry = getOrCreateEntry(item.sku);
            entry.receivedQuantity += item.receivedQuantity || 0;
          }
        }
      }
    }

    // 3. Accumulate Invoice line items across multiple Invoices
    if (Array.isArray(invoices)) {
      for (const invoice of invoices) {
        const invoiceItems = typeof invoice?.getItems === 'function'
          ? invoice.getItems()
          : invoice?.lineItems || [];

        for (const item of invoiceItems) {
          if (item && item.sku) {
            const entry = getOrCreateEntry(item.sku);
            entry.invoicedQuantity += item.quantity || 0;
            entry.invoicePrice = item.unitPrice || 0;
          }
        }
      }
    }

    return Array.from(skuMap.values());
  }
}

module.exports = LineItemAggregator;

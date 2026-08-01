'use strict';

const SKUResolver = require('../../sku/service/SKUResolver');

/**
 * @class LineItemAggregator
 *
 * Aggregates line item quantities and unit prices across Purchase Orders,
 * Goods Received Notes (GRNs), and Invoices, grouping metrics by canonical SKU.
 */
class LineItemAggregator {
  /**
   * @param {SKUResolver} [skuResolver]
   */
  constructor(skuResolver) {
    this._skuResolver = skuResolver || new SKUResolver();
  }

  /**
   * Aggregates line items from the provided document context grouped by canonical SKU.
   *
   * @param {Object} [context={}]
   * @param {Object} [context.purchaseOrder]
   * @param {Array} [context.grns]
   * @param {Array} [context.invoices]
   * @returns {Promise<Array<{
   *   sku: string,
   *   orderedQuantity: number,
   *   receivedQuantity: number,
   *   invoicedQuantity: number,
   *   orderedPrice: number,
   *   invoicePrice: number
   * }>>} Array of aggregated SKU entries.
   */
  async aggregate(context = {}) {
    const { purchaseOrder, grns = [], invoices = [] } = context;
    const skuMap = new Map();

    /**
     * Gets or initializes an aggregation record for a given canonical SKU.
     * @param {string} canonicalSku
     */
    const getOrCreateEntry = (canonicalSku) => {
      const normalisedSku = canonicalSku.trim().toUpperCase();
      if (!skuMap.has(normalisedSku)) {
        skuMap.set(normalisedSku, {
          sku: normalisedSku,
          orderedQuantity: 0,
          receivedQuantity: 0,
          rejectedQuantity: 0,
          rejectionReason: null,
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
        if (item) {
          const rawIdentifier = item.sku || item.poSku || item.ean || item.barcode;
          if (rawIdentifier) {
            const canonicalSku = await this._skuResolver.resolve(item);
            const entry = getOrCreateEntry(canonicalSku);
            entry.orderedQuantity += item.quantity || 0;
            entry.orderedPrice = item.unitPrice || 0;
            if (item.description && !entry.description) {
              entry.description = item.description;
            }
          }
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
          if (item) {
            const rawIdentifier = item.sku || item.ean || item.barcode;
            if (rawIdentifier) {
              const canonicalSku = await this._skuResolver.resolve(item);
              const entry = getOrCreateEntry(canonicalSku);
              entry.receivedQuantity += item.receivedQuantity || 0;
              entry.rejectedQuantity = (entry.rejectedQuantity || 0) + (item.rejectedQuantity || 0);
              if (item.rejectionReason) {
                entry.rejectionReason = item.rejectionReason;
              }
              if (item.description && !entry.description) {
                entry.description = item.description;
              }
            }
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
          if (item) {
            const rawIdentifier = item.sku || item.invoiceSku || item.ean || item.barcode;
            if (rawIdentifier) {
              const canonicalSku = await this._skuResolver.resolve(item);
              const entry = getOrCreateEntry(canonicalSku);
              entry.invoicedQuantity += item.quantity || 0;
              entry.invoicePrice = item.unitPrice || 0;
              if (item.description && !entry.description) {
                entry.description = item.description;
              }
            }
          }
        }
      }
    }

    // 4. Fallback: resolve missing product description from SKU Master catalogue
    for (const entry of skuMap.values()) {
      if (!entry.description && this._skuResolver?._skuRepository?.findBySkuCode) {
        try {
          const masterSku = await this._skuResolver._skuRepository.findBySkuCode(entry.sku);
          if (masterSku) {
            entry.description = masterSku.name || masterSku.description || '';
          }
        } catch (_err) {
          // Ignore lookup errors
        }
      }
    }

    return Array.from(skuMap.values());
  }
}

module.exports = LineItemAggregator;

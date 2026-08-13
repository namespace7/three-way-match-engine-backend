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
  /**
   * Aggregates line items from the provided document context grouped by canonical SKU.
   *
   * @param {Object} [context={}]
   * @param {Object} [context.purchaseOrder]
   * @param {Array} [context.grns]
   * @param {Array} [context.invoices]
   * @returns {Promise<Array<{
   *   sku: string,
   *   canonicalSku: string|null,
   *   externalCode: string,
   *   resolutionStatus: string,
   *   resolved: boolean,
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

    const vendorGstin = purchaseOrder?.supplier?.gstin
                     || purchaseOrder?.supplier?.taxId
                     || invoices?.[0]?.supplier?.gstin
                     || invoices?.[0]?.supplier?.taxId
                     || null;

    const processItem = async (item, docType, applyQty = {}, applyPrice = {}) => {
      if (!item) return;
      const rawIdentifier = item.sku || item.poSku || item.invoiceSku || item.ean || item.barcode;
      if (!rawIdentifier) return;

      const resolution = await this._skuResolver.resolve(item, { vendorGstin });

      // Handle raw string return (for backward compatibility with simple test mocks)
      const resObj = typeof resolution === 'string'
        ? { status: 'RESOLVED', canonicalSku: resolution, externalCode: resolution, source: 'CANONICAL', resolved: true }
        : resolution;

      const isResolved = resObj.resolved === true && Boolean(resObj.canonicalSku);

      let key;
      if (isResolved) {
        key = resObj.canonicalSku.trim().toUpperCase();
      } else {
        const extCode = (resObj.externalCode || rawIdentifier).trim().toUpperCase();
        key = `UNRESOLVED:${resObj.status || 'UNRESOLVED'}:${docType}:${extCode}:${item.lineNumber || Math.random().toString(36).substring(7)}`;
      }

      if (!skuMap.has(key)) {
        skuMap.set(key, {
          sku: isResolved ? key : (resObj.externalCode || rawIdentifier).trim().toUpperCase(),
          canonicalSku: isResolved ? key : null,
          externalCode: (resObj.externalCode || rawIdentifier).trim().toUpperCase(),
          resolutionStatus: resObj.status || (isResolved ? 'RESOLVED' : 'UNRESOLVED'),
          resolved: isResolved,
          source: resObj.source || 'FALLBACK',
          description: item.description || '',
          orderedQuantity: 0,
          receivedQuantity: 0,
          rejectedQuantity: 0,
          rejectionReason: null,
          invoicedQuantity: 0,
          orderedPrice: 0,
          invoicePrice: 0,
        });
      }

      const entry = skuMap.get(key);

      if (applyQty.ordered) entry.orderedQuantity += item.quantity || 0;
      if (applyQty.received) entry.receivedQuantity += item.receivedQuantity || 0;
      if (applyQty.rejected) {
        entry.rejectedQuantity = (entry.rejectedQuantity || 0) + (item.rejectedQuantity || 0);
        if (item.rejectionReason) entry.rejectionReason = item.rejectionReason;
      }
      if (applyQty.invoiced) entry.invoicedQuantity += item.quantity || 0;

      if (applyPrice.ordered) entry.orderedPrice = item.unitPrice || 0;
      if (applyPrice.invoiced) entry.invoicePrice = item.unitPrice || 0;

      if (item.description && !entry.description) {
        entry.description = item.description;
      }
    };

    // 1. Accumulate Purchase Order line items
    if (purchaseOrder) {
      const poItems = typeof purchaseOrder.getItems === 'function'
        ? purchaseOrder.getItems()
        : purchaseOrder.lineItems || [];

      for (const item of poItems) {
        await processItem(item, 'PO', { ordered: true }, { ordered: true });
      }
    }

    // 2. Accumulate GRN line items across multiple GRNs
    if (Array.isArray(grns)) {
      for (const grn of grns) {
        const grnItems = typeof grn?.getItems === 'function'
          ? grn.getItems()
          : grn?.lineItems || [];

        for (const item of grnItems) {
          await processItem(item, 'GRN', { received: true, rejected: true }, {});
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
          await processItem(item, 'INVOICE', { invoiced: true }, { invoiced: true });
        }
      }
    }

    // 4. Fallback: resolve missing product description from SKU Master catalogue
    for (const entry of skuMap.values()) {
      if (entry.resolved && !entry.description && this._skuResolver?._skuRepository?.findBySkuCode) {
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

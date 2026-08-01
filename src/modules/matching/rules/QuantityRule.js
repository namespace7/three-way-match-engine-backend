'use strict';

/**
 * @class QuantityRule
 *
 * Reconciliation rule that verifies quantity equality across Purchase Order (ordered),
 * Goods Received Note (received), and Invoice (invoiced) for each aggregated SKU line item.
 */
class QuantityRule {
  /**
   * Executes the quantity verification rule against aggregated line items or document context.
   *
   * Business Rules:
   *  1. orderedQuantity must equal receivedQuantity.
   *  2. receivedQuantity must equal invoicedQuantity.
   *
   * @param {Array|Object} input - Array of aggregated line items or context object containing lineItems.
   * @returns {{
   *   passed: boolean,
   *   code?: string,
   *   severity?: string,
   *   sku?: string,
   *   expected?: number,
   *   received?: number,
   *   invoiced?: number,
   *   message?: string
   * }}
   */
  execute(input = []) {
    const lineItems = Array.isArray(input) ? input : input?.lineItems || [];

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return { passed: true };
    }

    for (const item of lineItems) {
      const ordered = item.orderedQuantity ?? 0;
      const received = item.receivedQuantity ?? 0;
      const invoiced = item.invoicedQuantity ?? 0;

      // 1. GRN quantity exceeds PO quantity
      if (received > ordered) {
        return {
          passed: false,
          code: 'GRN_QTY_EXCEEDS_PO_QTY',
          severity: 'ERROR',
          sku: item.sku,
          expected: ordered,
          received,
          invoiced,
          message: `GRN quantity (${received}) exceeds PO quantity (${ordered}) for SKU ${item.sku}`,
        };
      }

      // 2. Invoice quantity exceeds GRN received quantity
      if (invoiced > received) {
        return {
          passed: false,
          code: 'INVOICE_QTY_EXCEEDS_GRN_QTY',
          severity: 'ERROR',
          sku: item.sku,
          expected: received,
          received,
          invoiced,
          message: `Invoice quantity (${invoiced}) exceeds GRN received quantity (${received}) for SKU ${item.sku}`,
        };
      }

      // 3. Invoice quantity exceeds PO quantity
      if (invoiced > ordered) {
        return {
          passed: false,
          code: 'INVOICE_QTY_EXCEEDS_PO_QTY',
          severity: 'ERROR',
          sku: item.sku,
          expected: ordered,
          received,
          invoiced,
          message: `Invoice quantity (${invoiced}) exceeds PO quantity (${ordered}) for SKU ${item.sku}`,
        };
      }
    }

    return {
      passed: true,
    };
  }
}

module.exports = QuantityRule;

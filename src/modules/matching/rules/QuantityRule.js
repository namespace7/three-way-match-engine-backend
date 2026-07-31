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

      // Rule 1: orderedQuantity must equal receivedQuantity
      // Rule 2: receivedQuantity must equal invoicedQuantity
      if (ordered !== received || received !== invoiced) {
        return {
          passed: false,
          code: 'QUANTITY_MISMATCH',
          severity: 'ERROR',
          sku: item.sku,
          expected: ordered,
          received,
          invoiced,
          message: `Quantity mismatch for SKU ${item.sku}: ordered ${ordered}, received ${received}, invoiced ${invoiced}`,
        };
      }
    }

    return {
      passed: true,
    };
  }
}

module.exports = QuantityRule;

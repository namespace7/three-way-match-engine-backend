'use strict';

/**
 * @class PriceRule
 *
 * Reconciliation rule that compares expected ordered unit price (orderedPrice)
 * against invoiced unit price (invoicePrice) for each SKU line item.
 */
class PriceRule {
  /**
   * Executes the price comparison rule against aggregated line items or document context.
   *
   * Business Rules:
   *  - Compare orderedPrice with invoicePrice for each SKU.
   *  - If equal: passed: true
   *  - If different: return violation(s) with code 'PRICE_MISMATCH'
   *  - Collect all mismatches without stopping after the first failure.
   *
   * @param {Array|Object} input - Array of aggregated line items or context object containing lineItems.
   * @returns {Object|Array<Object>} Single result object or array of failure objects.
   */
  execute(input = []) {
    const lineItems = Array.isArray(input) ? input : input?.lineItems || [];

    if (!Array.isArray(lineItems) || lineItems.length === 0) {
      return { passed: true };
    }

    const failures = [];

    for (const item of lineItems) {
      const expectedPrice = item.orderedPrice ?? 0;
      const invoicePrice = item.invoicePrice ?? 0;

      if (expectedPrice !== invoicePrice) {
        failures.push({
          passed: false,
          code: 'PRICE_MISMATCH',
          severity: 'ERROR',
          sku: item.sku,
          expectedPrice,
          invoicePrice,
          message: `Price mismatch for SKU ${item.sku}: expected ${expectedPrice}, invoiced ${invoicePrice}`,
        });
      }
    }

    if (failures.length === 0) {
      return { passed: true };
    }

    return failures.length === 1 ? failures[0] : failures;
  }
}

module.exports = PriceRule;

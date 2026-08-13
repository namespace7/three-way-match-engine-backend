'use strict';

/**
 * @class UnresolvedSKURule
 *
 * Reconciliation rule that checks whether all line items have resolved product identities.
 * For financial reconciliation safety, product identity must be resolved before quantity and price
 * comparisons can be evaluated.
 */
class UnresolvedSKURule {
  /**
   * Executes the unresolved SKU verification rule against line items or document context.
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
      if (item.resolved === false) {
        const isAmbiguous = item.resolutionStatus === 'AMBIGUOUS';
        const code = isAmbiguous ? 'SKU_AMBIGUOUS' : 'SKU_UNRESOLVED';
        const message = isAmbiguous
          ? `Ambiguous SKU identity for item code "${item.externalCode || item.sku}": maps to multiple canonical SKUs`
          : `Product identity unresolved for item code "${item.externalCode || item.sku}". Manual SKU mapping required.`;

        failures.push({
          passed: false,
          code,
          severity: 'WARNING',
          sku: item.externalCode || item.sku,
          externalCode: item.externalCode || item.sku,
          message,
        });
      }
    }

    if (failures.length === 0) {
      return { passed: true };
    }

    return failures.length === 1 ? failures[0] : failures;
  }
}

module.exports = UnresolvedSKURule;

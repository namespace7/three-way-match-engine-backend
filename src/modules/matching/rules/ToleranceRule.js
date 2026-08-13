'use strict';

/**
 * @class ToleranceRule
 *
 * Reconciliation rule that checks whether invoice unit price deviations fall
 * within an allowed percentage tolerance band relative to the ordered unit price.
 */
class ToleranceRule {
  /**
   * @param {number} [tolerancePercentage=2.0] - Allowed price variation percentage (default 2%).
   */
  constructor(tolerancePercentage = 2.0) {
    this._tolerancePercentage = tolerancePercentage;
  }

  /**
   * Executes the tolerance verification rule against aggregated line items or document context.
   *
   * Business Rules:
   *  - difference = Math.abs(invoicePrice - orderedPrice)
   *  - percentage = (difference / orderedPrice) * 100
   *  - If percentage <= tolerancePercentage: PASS
   *  - Else: FAIL with code 'PRICE_TOLERANCE_EXCEEDED' and severity 'WARNING'
   *  - Collects all violations without stopping after the first failure.
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
      if (item.resolved === false) continue; // Skip unresolved items; identity must be resolved before tolerance comparison

      const orderedPrice = item.orderedPrice ?? 0;
      const invoicePrice = item.invoicePrice ?? 0;

      // Calculate absolute difference and percentage variation
      const difference = Math.abs(invoicePrice - orderedPrice);

      let differencePercentage = 0;
      if (orderedPrice > 0) {
        differencePercentage = (difference / orderedPrice) * 100;
      } else if (invoicePrice > 0) {
        differencePercentage = 100;
      }

      // Round to 2 decimal places for clean float comparisons
      differencePercentage = Math.round(differencePercentage * 100) / 100;

      if (differencePercentage > this._tolerancePercentage) {
        failures.push({
          passed: false,
          code: 'PRICE_TOLERANCE_EXCEEDED',
          severity: 'WARNING',
          sku: item.sku,
          orderedPrice,
          invoicePrice,
          differencePercentage,
          tolerancePercentage: this._tolerancePercentage,
          message: `Price tolerance exceeded for SKU ${item.sku}: difference is ${differencePercentage}% (allowed ${this._tolerancePercentage}%)`,
        });
      }
    }

    if (failures.length === 0) {
      return { passed: true };
    }

    return failures.length === 1 ? failures[0] : failures;
  }
}

module.exports = ToleranceRule;

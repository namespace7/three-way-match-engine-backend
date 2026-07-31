'use strict';

/**
 * @class RuleEngine
 *
 * Maintains a collection of matching rules and executes them against an aggregated document context.
 *
 * Design notes:
 *  - Open/Closed: New rules (QuantityRule, PriceRule, ToleranceRule, DuplicateRule) can be added via constructor/registerRule.
 */
class RuleEngine {
  /**
   * @param {Array<Object>} [rules=[]] - List of matching rule instances.
   */
  constructor(rules = []) {
    this._rules = rules;
  }

  /**
   * Registers a matching rule to the engine pipeline.
   * @param {Object} rule
   */
  registerRule(rule) {
    this._rules.push(rule);
  }

  /**
   * Executes all registered matching rules sequentially against the context.
   *
   * @param {Object} context - Document context containing { purchaseOrder, grns, invoices }.
   * @returns {Promise<Array<Object>>} Array of rule execution results.
   */
  async execute(context) { // eslint-disable-line no-unused-vars
    const ruleResults = [];

    for (const rule of this._rules) {
      // TODO: Execute individual rules when implemented:
      //  - QuantityRule:  Compare PO ordered vs GRN received vs Invoice billed quantities
      //  - PriceRule:     Compare PO unit price vs Invoice unit price
      //  - ToleranceRule: Check price variances against SKU tolerance bands
      //  - DuplicateRule: Detect duplicate invoices for the same PO/GRN
      //
      // Example execution:
      // const result = await rule.evaluate(context);
      // ruleResults.push(result);
    }

    return ruleResults;
  }
}

module.exports = RuleEngine;

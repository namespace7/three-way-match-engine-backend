'use strict';

const MissingDocumentRule = require('./MissingDocumentRule');
const QuantityRule = require('./QuantityRule');
const PriceRule = require('./PriceRule');
const ToleranceRule = require('./ToleranceRule');
const DuplicateRule = require('./DuplicateRule');

/**
 * @class RuleEngine
 *
 * Maintains a pipeline of three-way matching rules and executes them sequentially against
 * the document and line item context. Collects all rule results without short-circuiting.
 */
class RuleEngine {
  /**
   * @param {Array<Object>} [rules] - Optional explicit list of rules. Defaults to standard rule pipeline.
   */
  constructor(rules) {
    this._rules = Array.isArray(rules) && rules.length > 0
      ? rules
      : [
          new MissingDocumentRule(),
          new DuplicateRule(),
          new QuantityRule(),
          new PriceRule(),
          new ToleranceRule(),
        ];
  }

  /**
   * Registers an additional matching rule to the pipeline.
   * @param {Object} rule
   */
  registerRule(rule) {
    this._rules.push(rule);
  }

  /**
   * Executes all registered matching rules sequentially against the context.
   * Collects every rule result without stopping after the first failure.
   *
   * @param {Object} context - Document context containing { purchaseOrder, grns, invoices, lineItems }.
   * @returns {Promise<Array<Object>>} Array of all rule execution results.
   */
  async execute(context) {
    const ruleResults = [];

    for (const rule of this._rules) {
      if (typeof rule.execute === 'function') {
        const result = await rule.execute(context);
        if (result) {
          if (Array.isArray(result)) {
            ruleResults.push(...result);
          } else {
            ruleResults.push(result);
          }
        }
      }
    }

    return ruleResults;
  }
}

module.exports = RuleEngine;

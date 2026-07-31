'use strict';

const MatchResult = require('../../../domain/MatchResult');
const { MatchStatus } = require('../../../domain/MatchResult');

/**
 * @class ResultBuilder
 *
 * Constructs a MatchResult domain object from all collected rule execution results.
 */
class ResultBuilder {
  /**
   * Builds and returns a MatchResult domain object based on rule evaluation outcomes.
   *
   * @param {Array<Object>} [ruleResults=[]] - Results collected from RuleEngine execution.
   * @param {Object} [context={}]            - Document context containing purchaseOrder, grns, invoices.
   * @returns {MatchResult}
   */
  build(ruleResults = [], context = {}) {
    const poNumber = context.purchaseOrder?.poNumber || context.poNumber || 'UNKNOWN';
    const grnNumber = context.grns?.[0]?.grnNumber || context.grnNumber || 'N/A';
    const invoiceNumber = context.invoices?.[0]?.invoiceNumber || context.invoiceNumber || 'N/A';

    const failures = ruleResults.filter((res) => res && res.passed === false);
    const hasFailures = failures.length > 0;

    const status = hasFailures ? MatchStatus.MISMATCHED : MatchStatus.MATCHED;

    const matchResult = new MatchResult({
      poNumber,
      grnNumber,
      invoiceNumber,
      status,
      reasons: [],
    });

    if (hasFailures) {
      for (const fail of failures) {
        const reasonMsg = fail.message
          ? `[${fail.code || 'FAIL'}] ${fail.message}`
          : `Rule failed: ${fail.code || 'UNKNOWN_ERROR'}`;
        matchResult.addReason(reasonMsg);
      }
    } else {
      matchResult.addReason('All three-way reconciliation rules passed successfully');
    }

    return matchResult;
  }
}

module.exports = ResultBuilder;

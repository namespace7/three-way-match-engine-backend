'use strict';

const MatchResult = require('../../../domain/MatchResult');
const { MatchStatus } = require('../../../domain/MatchResult');

/**
 * @class ResultBuilder
 *
 * Constructs a MatchResult domain object from collected rule execution results.
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

    // TODO: Evaluate ruleResults to determine final MatchStatus (MATCHED, PARTIAL, MISMATCHED, ERROR)
    const status = MatchStatus.PENDING;

    const matchResult = new MatchResult({
      poNumber,
      grnNumber,
      invoiceNumber,
      status,
      reasons: [],
    });

    // TODO: Populate reasons via matchResult.addReason(res.reason) for each rule result
    for (const res of ruleResults) {
      if (res && res.reason) {
        matchResult.addReason(res.reason);
      }
    }

    return matchResult;
  }
}

module.exports = ResultBuilder;

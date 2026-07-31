'use strict';

const DocumentAggregator = require('../aggregator/DocumentAggregator');
const LineItemAggregator = require('../aggregator/LineItemAggregator');
const RuleEngine = require('../rules/RuleEngine');
const ResultBuilder = require('../builder/ResultBuilder');
const MatchResult = require('../../../domain/MatchResult');

/**
 * @class MatchingService
 *
 * Orchestrates the Three-Way Match Engine workflow:
 *
 *   Load documents → Run LineItemAggregator → Execute RuleEngine → Pass results to ResultBuilder → Return MatchResult
 */
class MatchingService {
  /**
   * @param {DocumentAggregator} [documentAggregator]
   * @param {LineItemAggregator} [lineItemAggregator]
   * @param {RuleEngine} [ruleEngine]
   * @param {ResultBuilder} [resultBuilder]
   */
  constructor(documentAggregator, lineItemAggregator, ruleEngine, resultBuilder) {
    this._documentAggregator = documentAggregator || new DocumentAggregator();
    this._lineItemAggregator = lineItemAggregator || new LineItemAggregator();
    this._ruleEngine = ruleEngine || new RuleEngine();
    this._resultBuilder = resultBuilder || new ResultBuilder();
  }

  /**
   * Performs three-way matching for the specified Purchase Order number.
   *
   * Workflow:
   *  1. Load documents (PO, GRNs, Invoices) via DocumentAggregator.
   *  2. Run LineItemAggregator to group metrics by SKU.
   *  3. Execute RuleEngine on aggregated document and line items context.
   *  4. Pass rule results to ResultBuilder.
   *  5. Return MatchResult domain object.
   *
   * @param {string} poNumber - Purchase Order identifier.
   * @returns {Promise<MatchResult>}
   */
  async match(poNumber) {
    // ── Step 1: Load documents ─────────────────────────────────────────────
    const context = await this._documentAggregator.aggregate(poNumber);

    // ── Step 2: Run LineItemAggregator ──────────────────────────────────────
    const lineItems = this._lineItemAggregator.aggregate(context);

    const fullContext = {
      ...context,
      lineItems,
    };

    // ── Step 3: Execute RuleEngine ─────────────────────────────────────────
    const ruleResults = await this._ruleEngine.execute(fullContext);

    // ── Step 4: Pass rule results to ResultBuilder ─────────────────────────
    const matchResult = this._resultBuilder.build(ruleResults, fullContext);

    // ── Step 5: Return MatchResult ─────────────────────────────────────────
    return matchResult;
  }
}

module.exports = MatchingService;

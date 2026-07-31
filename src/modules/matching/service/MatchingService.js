'use strict';

const DocumentAggregator = require('../aggregator/DocumentAggregator');
const RuleEngine = require('../rules/RuleEngine');
const ResultBuilder = require('../builder/ResultBuilder');
const MatchResult = require('../../../domain/MatchResult');

/**
 * @class MatchingService
 *
 * Orchestrates the Three-Way Match Engine workflow:
 *
 *   Load documents  →  Run RuleEngine  →  Build Result  →  Return MatchResult
 *
 * Design notes:
 *  - Constructor injection for DocumentAggregator, RuleEngine, and ResultBuilder.
 *  - Clean separation of concerns.
 */
class MatchingService {
  /**
   * @param {DocumentAggregator} [documentAggregator]
   * @param {RuleEngine} [ruleEngine]
   * @param {ResultBuilder} [resultBuilder]
   */
  constructor(documentAggregator, ruleEngine, resultBuilder) {
    this._documentAggregator = documentAggregator || new DocumentAggregator();
    this._ruleEngine = ruleEngine || new RuleEngine();
    this._resultBuilder = resultBuilder || new ResultBuilder();
  }

  /**
   * Performs three-way matching for the specified Purchase Order number.
   *
   * Workflow:
   *  1. Load documents (PO, GRNs, Invoices) via DocumentAggregator.
   *  2. Run RuleEngine on aggregated document context.
   *  3. Build Result using ResultBuilder.
   *  4. Return MatchResult domain object.
   *
   * @param {string} poNumber - Purchase Order identifier.
   * @returns {Promise<MatchResult>}
   */
  async match(poNumber) {
    // ── Step 1: Load documents ─────────────────────────────────────────────
    const context = await this._documentAggregator.aggregate(poNumber);

    // ── Step 2: Run RuleEngine ─────────────────────────────────────────────
    const ruleResults = await this._ruleEngine.execute(context);

    // ── Step 3: Build Result ───────────────────────────────────────────────
    const matchResult = this._resultBuilder.build(ruleResults, context);

    // ── Step 4: Return MatchResult ─────────────────────────────────────────
    return matchResult;
  }
}

module.exports = MatchingService;

'use strict';

const MatchResult = require('../../../domain/MatchResult');
const { MatchStatus } = require('../../../domain/MatchResult');

/**
 * @class ResultBuilder
 *
 * Constructs a MatchResult domain object from all collected rule execution results and document context.
 */
class ResultBuilder {
  /**
   * Builds and returns a MatchResult domain object based on rule evaluation outcomes.
   *
   * @param {Array<Object>} [ruleResults=[]] - Results collected from RuleEngine execution.
   * @param {Object} [context={}]            - Document context containing purchaseOrder, grns, invoices, lineItems.
   * @returns {MatchResult}
   */
  build(ruleResults = [], context = {}) {
    const poNumber = context.purchaseOrder?.poNumber || context.poNumber || 'UNKNOWN';
    const grnNumber = context.grns?.[0]?.grnNumber || context.grnNumber || 'N/A';
    const invoiceNumber = context.invoices?.[0]?.invoiceNumber || context.invoiceNumber || 'N/A';

    const failures = ruleResults.filter((res) => res && res.passed === false);
    const hasFailures = failures.length > 0;

    const status = hasFailures ? MatchStatus.MISMATCHED : MatchStatus.MATCHED;

    const warnings = failures
      .filter((f) => f.severity === 'WARNING')
      .map((f) => ({ code: f.code, message: f.message, sku: f.sku }));

    const reasonCodes = failures.map((f) => f.code).filter(Boolean);

    // Compute aggregated metrics across line items
    const lineItems = Array.isArray(context.lineItems) ? context.lineItems : [];
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalInvoiced = 0;

    for (const item of lineItems) {
      totalOrdered += item.orderedQuantity || 0;
      totalReceived += item.receivedQuantity || 0;
      totalInvoiced += item.invoicedQuantity || 0;
    }

    const itemLevelResults = lineItems.map((item) => ({
      sku: item.sku,
      resolvedSku: item.sku,
      orderedQuantity: item.orderedQuantity || 0,
      receivedQuantity: item.receivedQuantity || 0,
      invoicedQuantity: item.invoicedQuantity || 0,
      orderedPrice: item.orderedPrice || 0,
      invoicePrice: item.invoicePrice || 0,
    }));

    const resolvedSku = lineItems.map((item) => item.sku);

    const poAmount = context.purchaseOrder?.totalAmount || 0;
    const invoiceTotalAmount = Array.isArray(context.invoices)
      ? context.invoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0)
      : 0;

    const matchResult = new MatchResult({
      poNumber,
      grnNumber,
      invoiceNumber,
      status,
      reasons: [],
      linkedDocuments: {
        po: context.purchaseOrder || null,
        grns: context.grns || [],
        invoices: context.invoices || [],
      },
      itemLevelResults,
      resolvedSku,
      aggregatedQuantities: {
        totalOrdered,
        totalReceived,
        totalInvoiced,
      },
      overallTotals: {
        poTotalAmount: poAmount,
        invoiceTotalAmount,
      },
      documentCounts: {
        poCount: context.purchaseOrder ? 1 : 0,
        grnCount: (context.grns || []).length,
        invoiceCount: (context.invoices || []).length,
      },
      warnings,
      reasonCodes,
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

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

    // Compute aggregated metrics across line items
    const lineItems = Array.isArray(context.lineItems) ? context.lineItems : [];
    let totalOrdered = 0;
    let totalReceived = 0;
    let totalRejected = 0;
    let totalInvoiced = 0;
    let isPartiallyFulfilled = false;

    for (const item of lineItems) {
      const ordered = item.orderedQuantity || 0;
      const received = item.receivedQuantity || 0;
      const invoiced = item.invoicedQuantity || 0;
      const rejected = item.rejectedQuantity || 0;

      totalOrdered += ordered;
      totalReceived += received;
      totalRejected += rejected;
      totalInvoiced += invoiced;

      if (received < ordered || invoiced < ordered) {
        isPartiallyFulfilled = true;
      }
    }

    const totalPending = Math.max(0, totalOrdered - totalReceived - totalRejected);

    let status = MatchStatus.MATCHED;
    if (hasFailures) {
      status = MatchStatus.MISMATCHED;
    } else if (isPartiallyFulfilled) {
      status = MatchStatus.PARTIALLY_MATCHED;
    }

    const warnings = failures
      .filter((f) => f.severity === 'WARNING')
      .map((f) => ({ code: f.code, message: f.message, sku: f.sku }));

    const reasonCodes = failures.map((f) => f.code).filter(Boolean);

    const itemLevelResults = lineItems.map((item) => {
      const ordered = item.orderedQuantity || 0;
      const received = item.receivedQuantity || 0;
      const rejected = item.rejectedQuantity || 0;
      const pending = Math.max(0, ordered - received - rejected);

      return {
        sku: item.sku,
        skuCode: item.sku,
        skuName: item.description || item.sku,
        description: item.description || '',
        resolvedSku: item.sku,

        // Standard properties
        orderedQuantity: ordered,
        receivedQuantity: received,
        rejectedQuantity: rejected,
        pendingQuantity: pending,
        rejectionReason: item.rejectionReason || null,
        invoicedQuantity: item.invoicedQuantity || 0,
        orderedPrice: item.orderedPrice || 0,
        invoicePrice: item.invoicePrice || 0,

        // Backward compatibility frontend property aliases
        poQuantity: ordered,
        grnQuantity: received,
        grnRejectedQuantity: rejected,
        invoiceQuantity: item.invoicedQuantity || 0,
        poUnitPrice: item.orderedPrice || 0,
        invoiceUnitPrice: item.invoicePrice || 0,
      };
    });

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
        totalRejected,
        totalPending,
        totalInvoiced,
      },
      overallTotals: {
        poTotalAmount: poAmount,
        invoiceTotalAmount,
        poTotal: poAmount,
        invoiceTotal: invoiceTotalAmount,
        priceDifference: Math.abs(poAmount - invoiceTotalAmount),
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
    } else if (status === MatchStatus.PARTIALLY_MATCHED) {
      matchResult.addReason('Warehouse accepted partial delivery. Supplier invoiced accepted quantity. No over-billing detected.');
    } else {
      matchResult.addReason('All three-way reconciliation rules passed successfully');
    }

    return matchResult;
  }
}

module.exports = ResultBuilder;

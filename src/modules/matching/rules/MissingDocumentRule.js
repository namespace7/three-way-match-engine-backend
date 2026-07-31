'use strict';

/**
 * @class MissingDocumentRule
 *
 * Business rule that verifies all required documents (Purchase Order, GRN, Invoice)
 * are present in the matching context.
 */
class MissingDocumentRule {
  /**
   * Executes the missing document validation against the document context.
   *
   * @param {Object} [context={}]
   * @param {Object|null} [context.purchaseOrder]
   * @param {Array} [context.grns]
   * @param {Array} [context.invoices]
   * @returns {{ passed: boolean, code?: string, severity?: string, message?: string }}
   */
  execute(context = {}) {
    const { purchaseOrder, grns, invoices } = context;

    if (!purchaseOrder) {
      return {
        passed: false,
        code: 'PO_NOT_FOUND',
        severity: 'ERROR',
        message: 'Purchase Order not found',
      };
    }

    if (!Array.isArray(grns) || grns.length === 0) {
      return {
        passed: false,
        code: 'GRN_NOT_FOUND',
        severity: 'ERROR',
        message: 'No Goods Receipt Note found',
      };
    }

    if (!Array.isArray(invoices) || invoices.length === 0) {
      return {
        passed: false,
        code: 'INVOICE_NOT_FOUND',
        severity: 'ERROR',
        message: 'No Invoice found',
      };
    }

    return {
      passed: true,
    };
  }
}

module.exports = MissingDocumentRule;

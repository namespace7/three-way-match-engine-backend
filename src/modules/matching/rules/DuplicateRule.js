'use strict';

/**
 * @class DuplicateRule
 *
 * Rule that checks for duplicate documents (multiple POs with same poNumber,
 * multiple GRNs with identical grnNumber, or multiple Invoices with identical invoiceNumber).
 */
class DuplicateRule {
  /**
   * @param {Object} context - { purchaseOrders, purchaseOrder, grns, invoices }
   * @returns {Object|Array<Object>} Rule execution result(s)
   */
  execute(context = {}) {
    const { purchaseOrders = [], grns = [], invoices = [] } = context;
    const failures = [];

    // Check duplicate POs
    if (Array.isArray(purchaseOrders) && purchaseOrders.length > 1) {
      failures.push({
        passed: false,
        code: 'DUPLICATE_PO',
        severity: 'WARNING',
        message: `Multiple Purchase Orders (${purchaseOrders.length}) found for PO reference`,
      });
    }

    // Check duplicate GRNs by grnNumber
    if (Array.isArray(grns) && grns.length > 0) {
      const grnNumbers = grns.map(g => g?.grnNumber).filter(Boolean);
      const uniqueGrnNumbers = new Set(grnNumbers);
      if (grnNumbers.length !== uniqueGrnNumbers.size) {
        failures.push({
          passed: false,
          code: 'DUPLICATE_GRN',
          severity: 'WARNING',
          message: 'Duplicate Goods Receipt Notes found with identical GRN numbers',
        });
      }
    }

    // Check duplicate Invoices by invoiceNumber
    if (Array.isArray(invoices) && invoices.length > 0) {
      const invoiceNumbers = invoices.map(i => i?.invoiceNumber).filter(Boolean);
      const uniqueInvoiceNumbers = new Set(invoiceNumbers);
      if (invoiceNumbers.length !== uniqueInvoiceNumbers.size) {
        failures.push({
          passed: false,
          code: 'DUPLICATE_INVOICE',
          severity: 'WARNING',
          message: 'Duplicate supplier invoices found with identical invoice numbers',
        });
      }
    }

    if (failures.length === 0) {
      return { passed: true };
    }

    return failures.length === 1 ? failures[0] : failures;
  }
}

module.exports = DuplicateRule;

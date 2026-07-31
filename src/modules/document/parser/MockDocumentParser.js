'use strict';

const DocumentParser = require('./DocumentParser');

/**
 * @class MockDocumentParser
 * @extends DocumentParser
 *
 * Test/development stand-in for a real AI-powered parser.
 * Returns hard-coded structured data so the rest of the pipeline
 * (mapper → validator → service) can be exercised without any external calls.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : returns fixture data; nothing else.
 *  - Open/Closed           : swap for a real parser by providing a different
 *                            concrete class — this file never needs editing.
 *  - Dependency Inversion  : callers depend on DocumentParser, not this class.
 */
class MockDocumentParser extends DocumentParser {
  /**
   * Returns a mocked parsed document object regardless of the file path.
   *
   * The shape intentionally contains all fields expected by the mapper layer
   * so the full pipeline can be exercised end-to-end in tests.
   *
   * @param {string} filePath - Path to the document file (ignored in mock).
   * @returns {Promise<Record<string, unknown>>} Mocked parsed document data.
   */
  async parse(filePath) { // eslint-disable-line no-unused-vars
    return {
      documentType: 'PURCHASE_ORDER',

      purchaseOrder: {
        poNumber: 'PO-2024-0001',
        issueDate: '2024-01-15',
        currency: 'USD',
        buyer: {
          name: 'Acme Corp',
          address: '123 Buyer Street, New York, NY 10001',
          taxId: 'US-TAX-123456',
        },
        supplier: {
          name: 'Global Supplies Ltd',
          address: '456 Supplier Ave, Los Angeles, CA 90001',
          taxId: 'US-TAX-654321',
        },
        lineItems: [
          {
            lineNumber: 1,
            sku: 'SKU-WIDGET-001',
            description: 'Blue Widget',
            quantity: 100,
            unitPrice: 9.99,
            totalPrice: 999.0,
          },
          {
            lineNumber: 2,
            sku: 'SKU-GADGET-002',
            description: 'Red Gadget',
            quantity: 50,
            unitPrice: 24.99,
            totalPrice: 1249.5,
          },
        ],
        totalAmount: 2248.5,
        paymentTerms: 'Net 30',
      },

      grn: {
        grnNumber: 'GRN-2024-0001',
        poReference: 'PO-2024-0001',
        receivedDate: '2024-01-20',
        warehouse: 'WH-EAST-01',
        receivedBy: 'Jane Smith',
        lineItems: [
          {
            lineNumber: 1,
            sku: 'SKU-WIDGET-001',
            orderedQuantity: 100,
            receivedQuantity: 98,
            rejectedQuantity: 2,
            rejectionReason: 'Damaged packaging',
          },
          {
            lineNumber: 2,
            sku: 'SKU-GADGET-002',
            orderedQuantity: 50,
            receivedQuantity: 50,
            rejectedQuantity: 0,
            rejectionReason: null,
          },
        ],
      },

      invoice: {
        invoiceNumber: 'INV-2024-0001',
        poReference: 'PO-2024-0001',
        grnReference: 'GRN-2024-0001',
        issueDate: '2024-01-22',
        dueDate: '2024-02-21',
        currency: 'USD',
        supplier: {
          name: 'Global Supplies Ltd',
          address: '456 Supplier Ave, Los Angeles, CA 90001',
          taxId: 'US-TAX-654321',
          bankAccount: 'BANK-ACC-9876',
        },
        lineItems: [
          {
            lineNumber: 1,
            sku: 'SKU-WIDGET-001',
            description: 'Blue Widget',
            quantity: 98,
            unitPrice: 9.99,
            totalPrice: 979.02,
          },
          {
            lineNumber: 2,
            sku: 'SKU-GADGET-002',
            description: 'Red Gadget',
            quantity: 50,
            unitPrice: 24.99,
            totalPrice: 1249.5,
          },
        ],
        subtotal: 2228.52,
        taxAmount: 0,
        totalAmount: 2228.52,
      },
    };
  }
}

module.exports = MockDocumentParser;

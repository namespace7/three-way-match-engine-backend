'use strict';

const DocumentParser = require('./DocumentParser');

/**
 * @class MockDocumentParser
 * @extends DocumentParser
 *
 * Test/development stand-in for a real AI-powered parser.
 * Returns deterministic structured data derived from the sample assignment PDFs
 * (Cloudstore Retail / M/s AFP procurement dataset) so the rest of the pipeline
 * (mapper → validator → service → matching engine) can be exercised without external calls.
 *
 * Design notes (SOLID):
 *  - Single Responsibility : returns fixture data; nothing else.
 *  - Open/Closed           : swap for a real parser by providing a different
 *                            concrete class — callers depend on DocumentParser interface.
 *  - Dependency Inversion  : callers depend on DocumentParser abstraction, not this class.
 */
class MockDocumentParser extends DocumentParser {
  /**
   * Returns a deterministic parsed document object based on the supplied assignment PDFs.
   *
   * @param {string} filePath - Path to the document file (ignored in mock mode).
   * @returns {Promise<Record<string, unknown>>} Mocked parsed document data.
   */
  async parse(filePath) { // eslint-disable-line no-unused-vars
    return {
      documentType: 'PURCHASE_ORDER',

      purchaseOrder: {
        poNumber: 'CI4PO05788',
        issueDate: '2026-03-17',
        currency: 'INR',
        buyer: {
          name: 'CLOUDSTORE RETAIL PRIVATE LIMITED',
          address: 'B-400, One K- Square Park, Padgha-Bhiwandi, Mumbai, Maharashtra - 421101, India',
          taxId: '27AAKCC0172C1Z1',
        },
        supplier: {
          name: 'M/s AFP',
          address: 'GALA NO 5/17 AB, Mumbai, Maharashtra, India-400072',
          taxId: '27ABACA2423J1Z0',
        },
        lineItems: [
          {
            lineNumber: 1,
            sku: '11423',
            description: 'Cheesy Spicy Veg Momos 24.0 Pieces',
            quantity: 50,
            unitPrice: 220.76,
            totalPrice: 11038.10,
          },
          {
            lineNumber: 2,
            sku: '11797',
            description: 'Meatigo Hot Wings 250.0 g',
            quantity: 75,
            unitPrice: 126.67,
            totalPrice: 9500.03,
          },
          {
            lineNumber: 3,
            sku: '18003',
            description: 'Meatigo Chicken Curry Cut Skinless Frozen 450.0 g',
            quantity: 120,
            unitPrice: 141.14,
            totalPrice: 16937.14,
          },
        ],
        totalAmount: 37475.27,
        paymentTerms: '0 Days',
      },

      grn: {
        grnNumber: 'CI4000020234',
        poReference: 'CI4PO05788',
        receivedDate: '2026-03-24',
        warehouse: 'B2B STAGING',
        receivedBy: 'Dhaval',
        lineItems: [
          {
            lineNumber: 1,
            sku: '11423',
            orderedQuantity: 50,
            receivedQuantity: 50,
            rejectedQuantity: 0,
            rejectionReason: null,
          },
          {
            lineNumber: 2,
            sku: '11797',
            orderedQuantity: 75,
            receivedQuantity: 75,
            rejectedQuantity: 0,
            rejectionReason: null,
          },
          {
            lineNumber: 3,
            sku: '18003',
            orderedQuantity: 120,
            receivedQuantity: 30,
            rejectedQuantity: 90,
            rejectionReason: 'Damaged packaging',
          },
        ],
      },

      invoice: {
        invoiceNumber: 'IN25MH2504251',
        poReference: 'CI4PO05788',
        grnReference: 'CI4000020234',
        issueDate: '2026-03-24',
        dueDate: '2026-03-24',
        currency: 'INR',
        supplier: {
          name: 'M/s AFP',
          address: 'M-8 /55/32, Taloja Navi Patalganga, Raigad, Mumbai Maharashtra-410206 INDIA',
          taxId: '27ABACA2423J1Z0',
          bankAccount: '50200034921174',
        },
        lineItems: [
          {
            lineNumber: 1,
            sku: '11423',
            description: 'Cheesy Spicy Veg Momos 24.0 Pieces',
            quantity: 50,
            unitPrice: 220.76,
            totalPrice: 11038.00,
          },
          {
            lineNumber: 2,
            sku: '11797',
            description: 'Meatigo Hot Wings 250.0 g',
            quantity: 75,
            unitPrice: 126.67,
            totalPrice: 9500.25,
          },
          {
            lineNumber: 3,
            sku: '18003',
            description: 'Meatigo Chicken Curry Cut Skinless Frozen 450.0 g',
            quantity: 30,
            unitPrice: 141.14,
            totalPrice: 4234.20,
          },
        ],
        subtotal: 24772.45,
        taxAmount: 1238.62,
        totalAmount: 26011.07,
      },
    };
  }
}

module.exports = MockDocumentParser;

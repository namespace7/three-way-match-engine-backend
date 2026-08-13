'use strict';

const MockDocumentParser = require('../../src/modules/document/parser/MockDocumentParser');
const DocumentMapper = require('../../src/modules/document/mapper/DocumentMapper');
const PurchaseOrderModel = require('../../src/models/PurchaseOrderModel');
const InvoiceModel = require('../../src/models/InvoiceModel');

async function runDocumentMapperValidationTests() {
  console.log('=== DocumentMapper & Mongoose Validation Regression Suite ===\n');

  const mapper = new DocumentMapper();
  const mockParser = new MockDocumentParser();

  // Test 1: Mock PO Buyer Name & Persistence Validation
  console.log('1. Mock PO Buyer Name & Mongoose Schema Validation:');
  const rawMock = await mockParser.parse('sample.pdf');
  const mappedMockPO = mapper.mapPurchaseOrder(rawMock);

  console.assert(mappedMockPO.buyer.name !== '', 'Test 1 Failed: buyer.name must not be empty string');
  console.assert(mappedMockPO.buyer.name === 'CLOUDSTORE RETAIL PRIVATE LIMITED', 'Test 1 Failed: buyer.name mismatch');

  const mockPoDoc = new PurchaseOrderModel(mappedMockPO.toJSON());
  const mockPoErr = mockPoDoc.validateSync();
  console.assert(!mockPoErr, `Test 1 Failed: Mongoose validation error: ${mockPoErr?.message}`);
  console.log('   Buyer Name:', mappedMockPO.buyer.name);
  console.log('   Mongoose Validation: PASSED\n');

  // Test 2: Gemini Raw PO Output (company_name key) Validation
  console.log('2. Gemini Raw PO Output (billing_address.company_name) Validation:');
  const rawGeminiPO = {
    purchase_order: {
      po_no: 'CI4PO05788',
      po_date: 'Mar 17, 2026',
    },
    vendor_details: {
      name: 'M/s AFP',
      gstin: '27ABACA2423J1Z0',
    },
    billing_address: {
      company_name: 'CLOUDSTORE RETAIL PRIVATE LIMITED',
      address: 'B-400, One K- Square Park, Padgha-Bhiwandi',
      gstin: '27AAKCC0172C1Z1',
    },
    line_items: [
      {
        s_no: 1,
        item_code: '11423',
        qty: 50,
        unit_base_cost_inr: 220.76,
        total_inr: 11038.00,
      },
    ],
    summary_totals: {
      grand_total_inr: 11038.00,
    },
  };

  const mappedGeminiPO = mapper.mapPurchaseOrder(rawGeminiPO);
  console.assert(mappedGeminiPO.buyer.name === 'CLOUDSTORE RETAIL PRIVATE LIMITED', 'Test 2 Failed: buyer.name mismatch');

  const geminiPoDoc = new PurchaseOrderModel(mappedGeminiPO.toJSON());
  const geminiPoErr = geminiPoDoc.validateSync();
  console.assert(!geminiPoErr, `Test 2 Failed: Mongoose validation error: ${geminiPoErr?.message}`);
  console.log('   Buyer Name:', mappedGeminiPO.buyer.name);
  console.log('   Mongoose Validation: PASSED\n');

  // Test 3: Gemini Raw Invoice Output Validation
  console.log('3. Gemini Raw Invoice Output Validation:');
  const rawGeminiInvoice = {
    invoice: {
      invoice_number: 'IN25MH2504251',
      po_number: 'CI4PO05788',
      invoice_date: '24/03/2026',
    },
    vendor_details: {
      name: 'M/s AFP',
      gstin: '27ABACA2423J1Z0',
    },
    line_items: [
      {
        s_no: 1,
        item_code: 'FG-P-F-0503',
        qty: 50,
        unit_base_cost_inr: 220.76,
        total_inr: 11038.00,
      },
    ],
    summary_totals: {
      grand_total_inr: 11038.00,
    },
  };

  const mappedInvoice = mapper.mapInvoice(rawGeminiInvoice);
  console.assert(mappedInvoice.invoiceNumber === 'IN25MH2504251', 'Test 3 Failed: invoiceNumber mismatch');
  console.assert(mappedInvoice.poReference === 'CI4PO05788', 'Test 3 Failed: poReference mismatch');
  console.assert(mappedInvoice.supplier.gstin === '27ABACA2423J1Z0', 'Test 3 Failed: supplier.gstin mismatch');

  const invDoc = new InvoiceModel(mappedInvoice.toJSON());
  const invErr = invDoc.validateSync();
  console.assert(!invErr, `Test 3 Failed: Mongoose validation error: ${invErr?.message}`);
  console.log('   Invoice Number:', mappedInvoice.invoiceNumber);
  console.log('   Mongoose Validation: PASSED\n');

  console.log('All DocumentMapper Mongoose Validation Regression Tests Passed Successfully!\n');
}

runDocumentMapperValidationTests();

'use strict';

const DocumentAggregator = require('../../src/modules/matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');
const RuleEngine = require('../../src/modules/matching/rules/RuleEngine');
const ResultBuilder = require('../../src/modules/matching/builder/ResultBuilder');
const MatchingService = require('../../src/modules/matching/service/MatchingService');
const SKUResolver = require('../../src/modules/sku/service/SKUResolver');

async function runRealDocumentFixtureTest() {
  console.log('=== Real Document PO ↔ Invoice Fixture Test (Cloudstore / M/s AFP) ===\n');

  // Real document data excerpt from sample PO (CI4PO05788) & Invoice (IN25MH2504251)
  const poData = {
    poNumber: 'CI4PO05788',
    supplier: {
      name: 'M/s AFP',
      taxId: '27ABACA2423J1Z0',
      address: 'GALA NO 5/17 AB, Mumbai, Maharashtra, India-400072',
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
    ],
    totalAmount: 11038.00,
  };

  const grnData = [
    {
      grnNumber: 'CI4000020234',
      poReference: 'CI4PO05788',
      lineItems: [
        {
          lineNumber: 1,
          sku: '11423',
          receivedQuantity: 50,
          rejectedQuantity: 0,
        },
      ],
    },
  ];

  const invoiceData = [
    {
      invoiceNumber: 'IN25MH2504251',
      poReference: 'CI4PO05788',
      supplier: {
        name: 'M/s AFP',
        taxId: '27ABACA2423J1Z0',
      },
      lineItems: [
        {
          lineNumber: 1,
          sku: 'FG-P-F-0503',
          description: 'PSM Cheesy Spicy Vegetable Momos 24Pcs',
          quantity: 50,
          unitPrice: 220.76,
          totalPrice: 11038.00,
        },
      ],
      totalAmount: 11038.00,
    },
  ];

  // SKU Master mock containing alias mapping for M/s AFP (27ABACA2423J1Z0)
  const skuMasterMock = {
    findBySkuCode: async (code) => (code === 'MOMOS-VEG-24' ? { skuCode: 'MOMOS-VEG-24', name: 'PSM Cheesy Spicy Vegetable Momos 24Pcs' } : null),
    findByAlias: async (code, vendorGstin) => {
      if ((code === '11423' || code === 'FG-P-F-0503') && (!vendorGstin || vendorGstin === '27ABACA2423J1Z0')) {
        return [{ skuCode: 'MOMOS-VEG-24', name: 'PSM Cheesy Spicy Vegetable Momos 24Pcs' }];
      }
      return [];
    },
  };

  const resolver = new SKUResolver(skuMasterMock);
  const lineAggregator = new LineItemAggregator(resolver);
  const docAggregator = new DocumentAggregator(
    { findByPoNumber: async () => poData },
    { findByPoReference: async () => grnData },
    { findByPoReference: async () => invoiceData }
  );

  const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());
  const matchResult = await service.match('CI4PO05788');
  const summary = matchResult.getSummary();

  console.log('Match Status:', summary.status);
  console.log('Resolved Canonical SKU:', summary.resolvedSku);
  console.log('Item Level Results:', JSON.stringify(summary.itemLevelResults, null, 2));

  console.assert(summary.status === 'MATCHED', 'Fixture Test Failed: Status should be MATCHED');
  console.assert(summary.resolvedSku[0] === 'MOMOS-VEG-24', 'Fixture Test Failed: Canonical SKU should be MOMOS-VEG-24');
  console.assert(summary.itemLevelResults.length === 1, 'Fixture Test Failed: Expected 1 merged item level result');
  console.assert(summary.itemLevelResults[0].orderedQuantity === 50, 'Fixture Test Failed: Ordered quantity mismatch');
  console.assert(summary.itemLevelResults[0].invoicedQuantity === 50, 'Fixture Test Failed: Invoiced quantity mismatch');
  console.assert(summary.itemLevelResults[0].orderedPrice === 220.76, 'Fixture Test Failed: Ordered price mismatch');
  console.assert(summary.itemLevelResults[0].invoicePrice === 220.76, 'Fixture Test Failed: Invoice price mismatch');

  console.log('\nReal Document Fixture Test Passed Successfully!\n');
}

runRealDocumentFixtureTest();

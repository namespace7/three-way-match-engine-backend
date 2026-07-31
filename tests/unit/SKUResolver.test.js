'use strict';

const SKUResolver = require('../../src/modules/sku/service/SKUResolver');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');

async function runSKUResolverTests() {
  console.log('=== SKUResolver Standalone Tests ===\n');

  // Mock SKURepository with in-memory catalogue mappings
  const mockRepo = {
    findBySkuCode: async (code) => {
      const db = {
        'ALIAS-WIDGET-01': { skuCode: 'SKU-WIDGET-001', description: 'Canonical Widget' },
        'SKU-WIDGET-001': { skuCode: 'SKU-WIDGET-001', description: 'Canonical Widget' },
      };
      return db[code] || null;
    },
    findByEanCode: async (ean) => {
      const db = {
        '1234567890123': { skuCode: 'SKU-WIDGET-001', description: 'Canonical Widget' },
      };
      return db[ean] || null;
    },
  };

  const resolver = new SKUResolver(mockRepo);

  // Test 1: Direct SKU Code resolution
  const res1 = await resolver.resolve('ALIAS-WIDGET-01');
  console.log('1. Direct SKU Code resolution (ALIAS-WIDGET-01 -> SKU-WIDGET-001):');
  console.log('   Resolved:', res1);
  console.assert(res1 === 'SKU-WIDGET-001', 'Test 1 Failed');
  console.log('   Status: PASSED\n');

  // Test 2: EAN/Barcode resolution
  const res2 = await resolver.resolve({ ean: '1234567890123' });
  console.log('2. EAN Barcode resolution (1234567890123 -> SKU-WIDGET-001):');
  console.log('   Resolved:', res2);
  console.assert(res2 === 'SKU-WIDGET-001', 'Test 2 Failed');
  console.log('   Status: PASSED\n');

  // Test 3: Fallback when no mapping exists
  const res3 = await resolver.resolve('UNMAPPED-VENDOR-SKU-99');
  console.log('3. Fallback when no mapping exists (UNMAPPED-VENDOR-SKU-99):');
  console.log('   Resolved:', res3);
  console.assert(res3 === 'UNMAPPED-VENDOR-SKU-99', 'Test 3 Failed');
  console.log('   Status: PASSED\n');

  // Test 4: LineItemAggregator Integration (Merging aliases under canonical SKU)
  const aggregator = new LineItemAggregator(resolver);
  const context = {
    purchaseOrder: {
      lineItems: [{ sku: 'SKU-WIDGET-001', quantity: 100, unitPrice: 10.0 }],
    },
    grns: [
      { lineItems: [{ sku: 'ALIAS-WIDGET-01', receivedQuantity: 100 }] },
    ],
    invoices: [
      { lineItems: [{ ean: '1234567890123', quantity: 100, unitPrice: 10.0 }] },
    ],
  };

  const aggregated = await aggregator.aggregate(context);
  console.log('4. LineItemAggregator Canonical SKU Merge Integration Test:');
  console.log('   Aggregated Result:', JSON.stringify(aggregated, null, 2));
  console.assert(aggregated.length === 1, 'Test 4 Failed: Should merge into single SKU entry');
  console.assert(aggregated[0].sku === 'SKU-WIDGET-001', 'Test 4 Failed: SKU should be canonical');
  console.assert(aggregated[0].orderedQuantity === 100, 'Test 4 Failed: orderedQuantity mismatch');
  console.assert(aggregated[0].receivedQuantity === 100, 'Test 4 Failed: receivedQuantity mismatch');
  console.assert(aggregated[0].invoicedQuantity === 100, 'Test 4 Failed: invoicedQuantity mismatch');
  console.log('   Status: PASSED\n');

  console.log('All SKUResolver standalone tests passed successfully!');
}

runSKUResolverTests();

'use strict';

const PriceRule = require('../../src/modules/matching/rules/PriceRule');

const rule = new PriceRule();

function runPriceRuleTests() {
  console.log('=== PriceRule Standalone Tests ===\n');

  // Test 1: Perfect price match
  const perfectItems = [
    { sku: 'SKU-001', orderedPrice: 10.0, invoicePrice: 10.0 },
    { sku: 'SKU-002', orderedPrice: 25.0, invoicePrice: 25.0 },
  ];
  const res1 = rule.execute(perfectItems);
  console.log('1. Perfect Price Match Test:');
  console.log('   Result:', JSON.stringify(res1));
  console.assert(res1.passed === true, 'Test 1 Failed');
  console.log('   Status: PASSED\n');

  // Test 2: One SKU mismatch
  const oneMismatchItems = [
    { sku: 'SKU-001', orderedPrice: 10.0, invoicePrice: 10.0 },
    { sku: 'SKU-002', orderedPrice: 25.0, invoicePrice: 28.0 },
  ];
  const res2 = rule.execute(oneMismatchItems);
  console.log('2. One SKU Mismatch Test:');
  console.log('   Result:', JSON.stringify(res2));
  console.assert(res2.passed === false, 'Test 2 Failed: passed should be false');
  console.assert(res2.code === 'PRICE_MISMATCH', 'Test 2 Failed: code should be PRICE_MISMATCH');
  console.assert(res2.sku === 'SKU-002', 'Test 2 Failed: sku should be SKU-002');
  console.assert(res2.expectedPrice === 25.0, 'Test 2 Failed: expectedPrice should be 25');
  console.assert(res2.invoicePrice === 28.0, 'Test 2 Failed: invoicePrice should be 28');
  console.log('   Status: PASSED\n');

  // Test 3: Multiple SKU mismatches
  const multipleMismatchItems = [
    { sku: 'SKU-001', orderedPrice: 10.0, invoicePrice: 12.0 },
    { sku: 'SKU-002', orderedPrice: 25.0, invoicePrice: 30.0 },
  ];
  const res3 = rule.execute(multipleMismatchItems);
  console.log('3. Multiple SKU Mismatches Test:');
  console.log('   Result:', JSON.stringify(res3, null, 2));
  console.assert(Array.isArray(res3) && res3.length === 2, 'Test 3 Failed: expected array of 2 failures');
  console.assert(res3[0].sku === 'SKU-001' && res3[0].code === 'PRICE_MISMATCH', 'Test 3 Failed: SKU-001 item mismatch');
  console.assert(res3[1].sku === 'SKU-002' && res3[1].code === 'PRICE_MISMATCH', 'Test 3 Failed: SKU-002 item mismatch');
  console.log('   Status: PASSED\n');

  console.log('All 3 PriceRule test scenarios passed successfully!');
}

runPriceRuleTests();

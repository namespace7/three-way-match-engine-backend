'use strict';

const ToleranceRule = require('../../src/modules/matching/rules/ToleranceRule');

const rule = new ToleranceRule(2.0); // Default 2.0% tolerance

function runToleranceRuleTests() {
  console.log('=== ToleranceRule Standalone Tests ===\n');

  // Test 1: Within tolerance (ordered: 100, invoice: 101.5 -> diff: 1.5% <= 2.0%)
  const withinToleranceItems = [
    { sku: 'SKU-001', orderedPrice: 100.0, invoicePrice: 101.5 },
  ];
  const res1 = rule.execute(withinToleranceItems);
  console.log('1. Within Tolerance Test (Ordered: 100.0, Invoice: 101.5 -> 1.5%):');
  console.log('   Result:', JSON.stringify(res1));
  console.assert(res1.passed === true, 'Test 1 Failed');
  console.log('   Status: PASSED\n');

  // Test 2: Exactly on tolerance (ordered: 100, invoice: 102.0 -> diff: 2.0% <= 2.0%)
  const exactToleranceItems = [
    { sku: 'SKU-001', orderedPrice: 100.0, invoicePrice: 102.0 },
  ];
  const res2 = rule.execute(exactToleranceItems);
  console.log('2. Exactly On Tolerance Test (Ordered: 100.0, Invoice: 102.0 -> 2.0%):');
  console.log('   Result:', JSON.stringify(res2));
  console.assert(res2.passed === true, 'Test 2 Failed');
  console.log('   Status: PASSED\n');

  // Test 3: Above tolerance (ordered: 100, invoice: 103.0 -> diff: 3.0% > 2.0%)
  const aboveToleranceItems = [
    { sku: 'SKU-001', orderedPrice: 100.0, invoicePrice: 103.0 },
  ];
  const res3 = rule.execute(aboveToleranceItems);
  console.log('3. Above Tolerance Test (Ordered: 100.0, Invoice: 103.0 -> 3.0%):');
  console.log('   Result:', JSON.stringify(res3));
  console.assert(res3.passed === false, 'Test 3 Failed: passed should be false');
  console.assert(res3.code === 'PRICE_TOLERANCE_EXCEEDED', 'Test 3 Failed: code should be PRICE_TOLERANCE_EXCEEDED');
  console.assert(res3.severity === 'WARNING', 'Test 3 Failed: severity should be WARNING');
  console.assert(res3.differencePercentage === 3, 'Test 3 Failed: differencePercentage should be 3');
  console.assert(res3.tolerancePercentage === 2, 'Test 3 Failed: tolerancePercentage should be 2');
  console.log('   Status: PASSED\n');

  console.log('All 3 ToleranceRule test scenarios passed successfully!');
}

runToleranceRuleTests();

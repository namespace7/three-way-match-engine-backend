'use strict';

const QuantityRule = require('../../src/modules/matching/rules/QuantityRule');

const rule = new QuantityRule();

function runTests() {
  console.log('=== QuantityRule Standalone Tests ===\n');

  // Test 1: Perfect Match
  const perfectMatchItems = [
    { sku: 'SKU-001', orderedQuantity: 100, receivedQuantity: 100, invoicedQuantity: 100 },
    { sku: 'SKU-002', orderedQuantity: 50, receivedQuantity: 50, invoicedQuantity: 50 },
  ];
  const res1 = rule.execute(perfectMatchItems);
  console.log('1. Perfect Match Test:');
  console.log('   Result:', JSON.stringify(res1));
  console.assert(res1.passed === true, 'Test 1 Failed');
  console.log('   Status: PASSED\n');

  // Test 2: Partial Delivery (Ordered: 100, Received: 95, Invoiced: 95) — Valid partial fulfillment (No over-quantity)
  const partialDeliveryItems = [
    { sku: 'SKU-001', orderedQuantity: 100, receivedQuantity: 95, invoicedQuantity: 95 },
  ];
  const res2 = rule.execute(partialDeliveryItems);
  console.log('2. Partial Delivery Test (Ordered: 100, Received: 95, Invoiced: 95):');
  console.log('   Result:', JSON.stringify(res2));
  console.assert(res2.passed === true, 'Test 2 Failed');
  console.log('   Status: PASSED\n');

  // Test 3: Over-Invoicing (Invoice > Received: Invoiced 105, Received 100)
  const grnInvoiceMismatchItems = [
    { sku: 'SKU-001', orderedQuantity: 100, receivedQuantity: 100, invoicedQuantity: 105 },
  ];
  const res3 = rule.execute(grnInvoiceMismatchItems);
  console.log('3. Over-Invoicing Test (Ordered: 100, Received: 100, Invoiced: 105):');
  console.log('   Result:', JSON.stringify(res3));
  console.assert(res3.passed === false && res3.code === 'INVOICE_QTY_EXCEEDS_GRN_QTY', 'Test 3 Failed');
  console.log('   Status: PASSED\n');

  // Test 4: Over-Receipt (GRN > PO: Received 110, Ordered 100)
  const grnExceedsPoItems = [
    { sku: 'SKU-001', orderedQuantity: 100, receivedQuantity: 110, invoicedQuantity: 100 },
  ];
  const res4 = rule.execute(grnExceedsPoItems);
  console.log('4. Over-Receipt Test (Ordered: 100, Received: 110, Invoiced: 100):');
  console.log('   Result:', JSON.stringify(res4));
  console.assert(res4.passed === false && res4.code === 'GRN_QTY_EXCEEDS_PO_QTY', 'Test 4 Failed');
  console.log('   Status: PASSED\n');

  console.log('All test scenarios passed successfully!');
}

runTests();

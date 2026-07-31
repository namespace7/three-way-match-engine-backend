'use strict';

const DocumentAggregator = require('../../src/modules/matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');
const RuleEngine = require('../../src/modules/matching/rules/RuleEngine');
const ResultBuilder = require('../../src/modules/matching/builder/ResultBuilder');
const MatchingService = require('../../src/modules/matching/service/MatchingService');
const MatchingController = require('../../src/modules/matching/controller/MatchingController');

async function runApiIntegrationTest() {
  console.log('=== Matching API Integration Test ===\n');

  // Mock repositories
  const mockPoRepo = {
    findByPoNumber: async (poNumber) => {
      if (poNumber === 'PO-2024-0001') {
        return {
          poNumber: 'PO-2024-0001',
          lineItems: [{ sku: 'SKU-WIDGET-001', quantity: 100, unitPrice: 10.0 }],
        };
      }
      return null; // PO not found
    },
  };

  const mockGrnRepo = {
    findByPoReference: async (poNumber) => {
      if (poNumber === 'PO-2024-0001') {
        return [
          { grnNumber: 'GRN-2024-0001', poReference: poNumber, lineItems: [{ sku: 'SKU-WIDGET-001', receivedQuantity: 100 }] },
        ];
      }
      return [];
    },
  };

  const mockInvRepo = {
    findByPoReference: async (poNumber) => {
      if (poNumber === 'PO-2024-0001') {
        return [
          { invoiceNumber: 'INV-2024-0001', poReference: poNumber, lineItems: [{ sku: 'SKU-WIDGET-001', quantity: 100, unitPrice: 10.0 }] },
        ];
      }
      return [];
    },
  };

  const aggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
  const matchingService = new MatchingService(
    aggregator,
    new LineItemAggregator(),
    new RuleEngine(),
    new ResultBuilder()
  );
  const controller = new MatchingController(matchingService);

  // 1. Test GET /api/v1/match/PO-2024-0001 (Existing PO -> HTTP 200)
  const req1 = { params: { poNumber: 'PO-2024-0001' } };
  const res1 = {
    status(code) { this.statusCode = code; return this; },
    json(body) {
      console.log('1. Existing PO Response (Status', this.statusCode + '):');
      console.log(JSON.stringify(body, null, 2));
      console.assert(this.statusCode === 200, 'Expected status 200');
      console.assert(body.success === true, 'Expected success === true');
      console.assert(body.data.status === 'MATCHED', 'Expected status MATCHED');
      console.log('   Status: PASSED\n');
    },
  };

  await controller.match(req1, res1, (err) => {
    if (err) console.error('Unexpected error in Test 1:', err);
  });

  // 2. Test GET /api/v1/match/PO-NONEXISTENT (Missing PO -> HTTP 404 via error middleware)
  const req2 = { params: { poNumber: 'PO-NONEXISTENT' } };
  const res2 = {
    status(code) { this.statusCode = code; return this; },
    json(body) {
      console.log('2. Non-existent PO Response (Status', this.statusCode + '):');
      console.log(JSON.stringify(body, null, 2));
    },
  };

  await controller.match(req2, res2, (err) => {
    console.log('2. Non-existent PO Error Caught by Middleware:');
    console.log('   Error Message:', err.message);
    console.log('   Error Code:', err.code);
    console.log('   HTTP Status Code:', err.statusCode);
    console.assert(err.statusCode === 404, 'Expected status 404');
    console.assert(err.code === 'PO_NOT_FOUND', 'Expected PO_NOT_FOUND code');
    console.log('   Status: PASSED\n');
  });

  console.log('Matching API integration test completed successfully!');
}

runApiIntegrationTest();

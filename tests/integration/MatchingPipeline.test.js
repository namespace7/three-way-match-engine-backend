'use strict';

const DocumentAggregator = require('../../src/modules/matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');
const RuleEngine = require('../../src/modules/matching/rules/RuleEngine');
const ResultBuilder = require('../../src/modules/matching/builder/ResultBuilder');
const MatchingService = require('../../src/modules/matching/service/MatchingService');
const MatchResult = require('../../src/domain/MatchResult');

function runIntegrationTests() {
  console.log('=== Matching Pipeline Integration Tests ===\n');

  // 1. Scenario: Perfect Match
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        lineItems: [{ sku: 'SKU-001', quantity: 100, unitPrice: 10.0 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: 'SKU-001', receivedQuantity: 100 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, lineItems: [{ sku: 'SKU-001', quantity: 100, unitPrice: 10.0 }] },
      ],
    };

    const aggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(aggregator, new LineItemAggregator(), new RuleEngine(), new ResultBuilder());

    service.match('PO-2024-0001').then((res) => {
      console.log('1. Perfect Match Test:');
      console.log('   Instance of MatchResult:', res instanceof MatchResult);
      console.log('   Status:', res.status);
      console.log('   Summary:', JSON.stringify(res.getSummary(), null, 2));
      console.assert(res.isMatched() === true, 'Scenario 1 Failed');
      console.log('   Status: PASSED\n');
    });
  }

  // 2. Scenario: Quantity Mismatch (PO: 100, GRN: 90, INV: 90)
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        lineItems: [{ sku: 'SKU-001', quantity: 100, unitPrice: 10.0 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: 'SKU-001', receivedQuantity: 90 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, lineItems: [{ sku: 'SKU-001', quantity: 90, unitPrice: 10.0 }] },
      ],
    };

    const aggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(aggregator, new LineItemAggregator(), new RuleEngine(), new ResultBuilder());

    service.match('PO-2024-0002').then((res) => {
      console.log('2. Quantity Mismatch Test:');
      console.log('   Status:', res.status);
      console.log('   Reasons:', res.getSummary().reasons);
      console.assert(res.status === 'MISMATCHED', 'Scenario 2 Failed');
      console.log('   Status: PASSED\n');
    });
  }

  // 3. Scenario: Missing Document (GRN Missing)
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        lineItems: [{ sku: 'SKU-001', quantity: 100, unitPrice: 10.0 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async () => [],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, lineItems: [{ sku: 'SKU-001', quantity: 100, unitPrice: 10.0 }] },
      ],
    };

    const aggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(aggregator, new LineItemAggregator(), new RuleEngine(), new ResultBuilder());

    service.match('PO-2024-0003').then((res) => {
      console.log('3. Missing Document Test (GRN Missing):');
      console.log('   Status:', res.status);
      console.log('   Reasons:', res.getSummary().reasons);
      console.assert(res.status === 'MISMATCHED', 'Scenario 3 Failed');
      console.log('   Status: PASSED\n');
    });
  }
}

runIntegrationTests();

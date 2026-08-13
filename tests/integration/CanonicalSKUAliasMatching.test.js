'use strict';

const DocumentAggregator = require('../../src/modules/matching/aggregator/DocumentAggregator');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');
const RuleEngine = require('../../src/modules/matching/rules/RuleEngine');
const ResultBuilder = require('../../src/modules/matching/builder/ResultBuilder');
const MatchingService = require('../../src/modules/matching/service/MatchingService');
const SKUResolver = require('../../src/modules/sku/service/SKUResolver');
const MatchResult = require('../../src/domain/MatchResult');

async function runAliasMatchingIntegrationTests() {
  console.log('=== Phase 3E Canonical SKU Alias Matching Integration Test Suite ===\n');

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1 — Same external code (PO: 11423, Invoice: 11423)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' },
        lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: '11423', receivedQuantity: 50 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' }, lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }] },
      ],
    };
    const mockSkuRepo = {
      findBySkuCode: async (code) => (code === '11423' ? { skuCode: '11423', name: 'Veg Momos' } : null),
    };

    const resolver = new SKUResolver(mockSkuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const res = await service.match('PO-SAME-CODE');
    console.log('1. Same External Code Match Test:');
    console.log('   Status:', res.status);
    console.log('   Is Matched:', res.isMatched());
    console.assert(res.isMatched() === true, 'Test 1 Failed: Status should be MATCHED');
    console.assert((res.getSummary().reasonCodes || []).length === 0, 'Test 1 Failed: Should have no failure reason codes');
    console.log('   Status: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2 — Different codes WITH SKU Master alias mapping (11423 & FG-P-F-0503 -> CAN-001)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' },
        lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: '11423', receivedQuantity: 50 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' }, lineItems: [{ sku: 'FG-P-F-0503', quantity: 50, unitPrice: 220.76 }] },
      ],
    };
    const mockSkuRepo = {
      findBySkuCode: async () => null,
      findByAlias: async (code) => {
        if (code === '11423' || code === 'FG-P-F-0503') {
          return [{ skuCode: 'CAN-001', name: 'PSM Cheesy Spicy Veg Momos 24Pcs' }];
        }
        return [];
      },
    };

    const resolver = new SKUResolver(mockSkuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const res = await service.match('PO-ALIAS-MATCH');
    console.log('2. Alias Match Test (11423 & FG-P-F-0503 -> CAN-001):');
    console.log('   Status:', res.status);
    console.log('   Resolved SKUs:', res.getSummary().resolvedSku);
    console.assert(res.isMatched() === true, 'Test 2 Failed: Status should be MATCHED');
    console.assert(res.getSummary().resolvedSku[0] === 'CAN-001', 'Test 2 Failed: Resolved SKU should be CAN-001');
    console.assert(res.getSummary().itemLevelResults.length === 1, 'Test 2 Failed: Should merge into single SKU item level result');
    console.assert(res.getSummary().itemLevelResults[0].orderedQuantity === 50 && res.getSummary().itemLevelResults[0].invoicedQuantity === 50, 'Test 2 Failed: Quantities should be combined');
    console.log('   Status: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3 — Different codes WITHOUT SKU Master alias mapping (11423 & FG-P-F-0503)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' },
        lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: '11423', receivedQuantity: 50 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' }, lineItems: [{ sku: 'FG-P-F-0503', quantity: 50, unitPrice: 220.76 }] },
      ],
    };
    const mockSkuRepo = {
      findBySkuCode: async () => null,
      findByAlias: async () => [],
    };

    const resolver = new SKUResolver(mockSkuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const res = await service.match('PO-NO-MAPPING');
    console.log('3. Unresolved SKU Test (No Alias Mapping):');
    console.log('   Status:', res.status);
    console.log('   Reason Codes:', res.getSummary().reasonCodes);
    console.assert((res.getSummary().reasonCodes || []).includes('SKU_UNRESOLVED'), 'Test 3 Failed: Should contain SKU_UNRESOLVED reason code');
    console.assert(!(res.getSummary().reasonCodes || []).includes('PRICE_MISMATCH'), 'Test 3 Failed: Must NOT report false PRICE_MISMATCH');
    console.assert(!(res.getSummary().reasonCodes || []).includes('QUANTITY_MISMATCH'), 'Test 3 Failed: Must NOT report false QUANTITY_MISMATCH');
    console.log('   Status: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 4 — Ambiguous Alias Mapping (11423 -> [CAN-001, CAN-002])
  // ───────────────────────────────────────────────────────────────────────────
  {
    const mockPoRepo = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' },
        lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }],
      }),
    };
    const mockGrnRepo = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-001', poReference: po, lineItems: [{ sku: '11423', receivedQuantity: 50 }] },
      ],
    };
    const mockInvRepo = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-001', poReference: po, supplier: { name: 'M/s AFP', taxId: '27ABACA2423J1Z0' }, lineItems: [{ sku: '11423', quantity: 50, unitPrice: 220.76 }] },
      ],
    };
    const mockSkuRepo = {
      findBySkuCode: async () => null,
      findByAlias: async (code) => (code === '11423' ? [{ skuCode: 'CAN-001' }, { skuCode: 'CAN-002' }] : []),
    };

    const resolver = new SKUResolver(mockSkuRepo);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(mockPoRepo, mockGrnRepo, mockInvRepo);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const res = await service.match('PO-AMBIGUOUS');
    console.log('4. Ambiguous Alias Test:');
    console.log('   Status:', res.status);
    console.log('   Reason Codes:', res.getSummary().reasonCodes);
    console.assert((res.getSummary().reasonCodes || []).includes('SKU_AMBIGUOUS'), 'Test 4 Failed: Should report SKU_AMBIGUOUS');
    console.log('   Status: PASSED\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 5 — Vendor-Scoped Alias Resolution (Vendor A vs Vendor B)
  // ───────────────────────────────────────────────────────────────────────────
  {
    const mockPoRepoVendorA = {
      findByPoNumber: async (po) => ({
        poNumber: po,
        supplier: { name: 'Vendor A', taxId: 'GSTIN-VENDOR-A' },
        lineItems: [{ sku: '11423', quantity: 10, unitPrice: 100 }],
      }),
    };
    const mockGrnRepoVendorA = {
      findByPoReference: async (po) => [
        { grnNumber: 'GRN-A', poReference: po, lineItems: [{ sku: '11423', receivedQuantity: 10 }] },
      ],
    };
    const mockInvRepoVendorA = {
      findByPoReference: async (po) => [
        { invoiceNumber: 'INV-A', poReference: po, supplier: { name: 'Vendor A', taxId: 'GSTIN-VENDOR-A' }, lineItems: [{ sku: '11423', quantity: 10, unitPrice: 100 }] },
      ],
    };
    const mockSkuRepoVendor = {
      findBySkuCode: async () => null,
      findByAlias: async (code, vendorGstin) => {
        if (code === '11423') {
          if (vendorGstin === 'GSTIN-VENDOR-A') return [{ skuCode: 'CAN-PRODUCT-A' }];
          if (vendorGstin === 'GSTIN-VENDOR-B') return [{ skuCode: 'CAN-PRODUCT-B' }];
        }
        return [];
      },
    };

    const resolver = new SKUResolver(mockSkuRepoVendor);
    const lineAggregator = new LineItemAggregator(resolver);
    const docAggregator = new DocumentAggregator(mockPoRepoVendorA, mockGrnRepoVendorA, mockInvRepoVendorA);
    const service = new MatchingService(docAggregator, lineAggregator, new RuleEngine(), new ResultBuilder());

    const res = await service.match('PO-VENDOR-A');
    console.log('5. Vendor-Scoped Alias Resolution Test:');
    console.log('   Resolved SKU for Vendor A:', res.getSummary().resolvedSku);
    console.assert(res.getSummary().resolvedSku[0] === 'CAN-PRODUCT-A', 'Test 5 Failed: Should resolve to CAN-PRODUCT-A for Vendor A');
    console.assert(res.isMatched() === true, 'Test 5 Failed: Should match for Vendor A');
    console.log('   Status: PASSED\n');
  }

  console.log('All Phase 3E Canonical SKU Alias Matching integration tests passed successfully!\n');
}

runAliasMatchingIntegrationTests();

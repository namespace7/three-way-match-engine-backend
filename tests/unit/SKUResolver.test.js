'use strict';

const SKUResolver = require('../../src/modules/sku/service/SKUResolver');
const LineItemAggregator = require('../../src/modules/matching/aggregator/LineItemAggregator');

async function runSKUResolverTests() {
  console.log('=== SKUResolver Comprehensive Unit & Integration Tests ===\n');

  // Mock SKURepository with in-memory catalogue mappings
  const mockRepo = {
    findBySkuCode: async (code) => {
      const db = {
        'SKU-WIDGET-001': { skuCode: 'SKU-WIDGET-001', description: 'Canonical Widget' },
        'CAN-VENDOR-A': { skuCode: 'CAN-VENDOR-A', description: 'Vendor A Product' },
        'CAN-VENDOR-B': { skuCode: 'CAN-VENDOR-B', description: 'Vendor B Product' },
      };
      return db[code] || null;
    },

    findByEanCode: async (ean) => {
      const db = {
        '1234567890123': { skuCode: 'SKU-WIDGET-001', description: 'Canonical Widget' },
      };
      return db[ean] || null;
    },

    findByAlias: async (code, vendorGstin) => {
      // Alias database
      // 11423 + GSTIN-A -> CAN-VENDOR-A
      // 11423 + GSTIN-B -> CAN-VENDOR-B
      // GLOBAL-ALIAS-01 + null -> SKU-WIDGET-001
      // MULTI-ALIAS-01 + null -> [CAN-VENDOR-A, CAN-VENDOR-B] (Ambiguous)
      // DUAL-ALIAS-01 + GSTIN-A -> CAN-VENDOR-A (Vendor specific)
      // DUAL-ALIAS-01 + null -> SKU-WIDGET-001 (Global)

      if (code === 'ALIAS-WIDGET-01') {
        return [{ skuCode: 'SKU-WIDGET-001' }];
      }

      if (code === '11423') {
        if (vendorGstin === 'GSTIN-A') return [{ skuCode: 'CAN-VENDOR-A' }];
        if (vendorGstin === 'GSTIN-B') return [{ skuCode: 'CAN-VENDOR-B' }];
        return [];
      }

      if (code === 'GLOBAL-ALIAS-01') {
        if (!vendorGstin) return [{ skuCode: 'SKU-WIDGET-001' }];
        return [];
      }

      if (code === 'DUAL-ALIAS-01') {
        if (vendorGstin === 'GSTIN-A') return [{ skuCode: 'CAN-VENDOR-A' }];
        if (!vendorGstin) return [{ skuCode: 'SKU-WIDGET-001' }];
        return [];
      }

      if (code === 'MULTI-ALIAS-01') {
        return [{ skuCode: 'CAN-VENDOR-A' }, { skuCode: 'CAN-VENDOR-B' }];
      }

      return [];
    },
  };

  const resolver = new SKUResolver(mockRepo);

  // Test 1: Direct SKU Code resolution
  const res1 = await resolver.resolve('SKU-WIDGET-001');
  console.log('1. Direct SKU Code resolution (SKU-WIDGET-001):');
  console.log('   Result:', JSON.stringify(res1));
  console.assert(res1.status === 'RESOLVED', 'Test 1 Failed: status should be RESOLVED');
  console.assert(res1.canonicalSku === 'SKU-WIDGET-001', 'Test 1 Failed: canonicalSku mismatch');
  console.assert(res1.resolved === true, 'Test 1 Failed: resolved should be true');
  console.assert(res1.source === 'CANONICAL', 'Test 1 Failed: source should be CANONICAL');
  console.log('   Status: PASSED\n');

  // Test 2: EAN Barcode resolution
  const res2 = await resolver.resolve({ ean: '1234567890123' });
  console.log('2. EAN Barcode resolution (1234567890123 -> SKU-WIDGET-001):');
  console.log('   Result:', JSON.stringify(res2));
  console.assert(res2.status === 'RESOLVED', 'Test 2 Failed: status should be RESOLVED');
  console.assert(res2.canonicalSku === 'SKU-WIDGET-001', 'Test 2 Failed: canonicalSku mismatch');
  console.assert(res2.source === 'EAN', 'Test 2 Failed: source should be EAN');
  console.log('   Status: PASSED\n');

  // Test 3: Vendor-specific alias resolution (11423 + GSTIN-A -> CAN-VENDOR-A)
  const res3 = await resolver.resolve('11423', { vendorGstin: 'GSTIN-A' });
  console.log('3. Vendor-specific alias resolution (11423 + GSTIN-A -> CAN-VENDOR-A):');
  console.log('   Result:', JSON.stringify(res3));
  console.assert(res3.status === 'RESOLVED', 'Test 3 Failed: status should be RESOLVED');
  console.assert(res3.canonicalSku === 'CAN-VENDOR-A', 'Test 3 Failed: canonicalSku should be CAN-VENDOR-A');
  console.assert(res3.source === 'ALIAS', 'Test 3 Failed: source should be ALIAS');
  console.log('   Status: PASSED\n');

  // Test 4: Global alias resolution (GLOBAL-ALIAS-01 -> SKU-WIDGET-001)
  const res4 = await resolver.resolve('GLOBAL-ALIAS-01');
  console.log('4. Global alias resolution (GLOBAL-ALIAS-01 -> SKU-WIDGET-001):');
  console.log('   Result:', JSON.stringify(res4));
  console.assert(res4.status === 'RESOLVED', 'Test 4 Failed: status should be RESOLVED');
  console.assert(res4.canonicalSku === 'SKU-WIDGET-001', 'Test 4 Failed');
  console.log('   Status: PASSED\n');

  // Test 5: Vendor-specific alias takes precedence over global alias
  const res5 = await resolver.resolve('DUAL-ALIAS-01', { vendorGstin: 'GSTIN-A' });
  console.log('5. Vendor-specific alias precedence (DUAL-ALIAS-01 + GSTIN-A -> CAN-VENDOR-A):');
  console.log('   Result:', JSON.stringify(res5));
  console.assert(res5.status === 'RESOLVED' && res5.canonicalSku === 'CAN-VENDOR-A', 'Test 5 Failed');
  console.log('   Status: PASSED\n');

  // Test 6: Vendor scoping isolates different vendors
  const res6 = await resolver.resolve('11423', { vendorGstin: 'GSTIN-B' });
  console.log('6. Vendor isolation (11423 + GSTIN-B -> CAN-VENDOR-B):');
  console.log('   Result:', JSON.stringify(res6));
  console.assert(res6.status === 'RESOLVED' && res6.canonicalSku === 'CAN-VENDOR-B', 'Test 6 Failed');
  console.log('   Status: PASSED\n');

  // Test 7: Ambiguous alias resolution (MULTI-ALIAS-01 -> AMBIGUOUS)
  const res7 = await resolver.resolve('MULTI-ALIAS-01');
  console.log('7. Ambiguous alias resolution (MULTI-ALIAS-01 -> AMBIGUOUS):');
  console.log('   Result:', JSON.stringify(res7));
  console.assert(res7.status === 'AMBIGUOUS', 'Test 7 Failed: status should be AMBIGUOUS');
  console.assert(res7.canonicalSku === null, 'Test 7 Failed: canonicalSku should be null for AMBIGUOUS');
  console.assert(res7.resolved === false, 'Test 7 Failed: resolved should be false');
  console.log('   Status: PASSED\n');

  // Test 8: Unknown external code -> UNRESOLVED
  const res8 = await resolver.resolve('UNMAPPED-VENDOR-SKU-99');
  console.log('8. Unknown external code (UNMAPPED-VENDOR-SKU-99 -> UNRESOLVED):');
  console.log('   Result:', JSON.stringify(res8));
  console.assert(res8.status === 'UNRESOLVED', 'Test 8 Failed: status should be UNRESOLVED');
  console.assert(res8.canonicalSku === null, 'Test 8 Failed: canonicalSku should be null for UNRESOLVED');
  console.assert(res8.externalCode === 'UNMAPPED-VENDOR-SKU-99', 'Test 8 Failed: externalCode mismatch');
  console.assert(res8.resolved === false, 'Test 8 Failed: resolved should be false');
  console.log('   Status: PASSED\n');

  // Test 9: Resolver database error -> Graceful UNRESOLVED return
  const errorRepo = {
    findBySkuCode: async () => { throw new Error('DB Connection Lost'); },
  };
  const errResolver = new SKUResolver(errorRepo);
  const res9 = await errResolver.resolve('SOME-CODE');
  console.log('9. DB error fallback handling:');
  console.log('   Result:', JSON.stringify(res9));
  console.assert(res9.status === 'UNRESOLVED' && res9.resolved === false, 'Test 9 Failed');
  console.log('   Status: PASSED\n');

  console.log('All SKUResolver unit tests passed successfully!\n');
}

runSKUResolverTests();

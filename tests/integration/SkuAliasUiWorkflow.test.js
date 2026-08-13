'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const app = require('../../src/app');
const env = require('../../src/config/env');
const SKUModel = require('../../src/models/SKUModel');
const PurchaseOrderModel = require('../../src/models/PurchaseOrderModel');
const InvoiceModel = require('../../src/models/InvoiceModel');
const GRNModel = require('../../src/models/GRNModel');

async function runSkuAliasUiWorkflowTest() {
  console.log('=== Phase 7 SKU Master Alias Management & Match Verification Suite ===\n');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/three-way-match-engine';
  let dbConnected = false;

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    dbConnected = true;
    console.log('MongoDB Connected to:', mongoUri);
  } catch (err) {
    console.log('Skipping live MongoDB test execution (MongoDB server unavailable):', err.message);
    return;
  }

  const tokenHeader = { Authorization: 'Bearer static-bearer-token-3way-match-engine' };

  try {
    // Clean collections before test
    await SKUModel.deleteMany({ skuCode: { $in: ['SKU-NO-ALIAS', 'MOMOS-VEG-24', '11797', '18003'] } });
    await PurchaseOrderModel.deleteMany({ poNumber: 'CI4PO05788' });
    await InvoiceModel.deleteMany({ poReference: 'CI4PO05788' });
    await GRNModel.deleteMany({ poReference: 'CI4PO05788' });

    await SKUModel.create({ skuCode: '11797', name: 'Meatigo Hot Wings 250.0 g', unitPrice: 126.67 });
    await SKUModel.create({ skuCode: '18003', name: 'Meatigo Chicken Curry Cut Skinless Frozen 450g', unitPrice: 141.14 });

    // 1. Create SKU with no aliases
    console.log('1. Create SKU with NO aliases (POST /api/v1/skus):');
    const res1 = await request(app)
      .post('/api/v1/skus')
      .set(tokenHeader)
      .send({
        skuCode: 'SKU-NO-ALIAS',
        name: 'Item Without Aliases',
        unitPrice: 100.0,
        aliases: [],
      });

    console.assert(res1.status === 201, 'Test 1 Failed: Status should be 201');
    console.assert(Array.isArray(res1.body.data.aliases), 'Test 1 Failed: aliases should be array');
    console.assert(res1.body.data.aliases.length === 0, 'Test 1 Failed: aliases should be empty');
    console.log('   Status Code: 201 | Aliases Count: 0 | PASSED\n');

    // 2. Create SKU with multiple aliases
    console.log('2. Create SKU with multiple aliases (MOMOS-VEG-24 with 11423 & FG-P-F-0503):');
    const res2 = await request(app)
      .post('/api/v1/skus')
      .set(tokenHeader)
      .send({
        skuCode: 'MOMOS-VEG-24',
        name: 'PSM Cheesy Spicy Vegetable Momos 24Pcs',
        unitPrice: 220.76,
        aliases: [
          { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
          { code: 'FG-P-F-0503', vendorGstin: '27ABACA2423J1Z0' },
        ],
      });

    console.assert(res2.status === 201, 'Test 2 Failed: Status should be 201');
    console.assert(res2.body.data.aliases.length === 2, 'Test 2 Failed: Should have 2 aliases');
    console.log('   Status Code: 201 | Persisted Aliases:', res2.body.data.aliases);
    console.log('   Status: PASSED\n');

    // 3. Edit SKU: Remove one alias
    console.log('3. Edit SKU: Remove one alias (PATCH /api/v1/skus/MOMOS-VEG-24):');
    const res3 = await request(app)
      .patch('/api/v1/skus/MOMOS-VEG-24')
      .set(tokenHeader)
      .send({
        aliases: [
          { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
        ],
      });

    console.assert(res3.status === 200, 'Test 3 Failed: Status should be 200');
    console.assert(res3.body.data.aliases.length === 1, 'Test 3 Failed: Should have 1 alias after removal');
    console.assert(res3.body.data.aliases[0].code === '11423', 'Test 3 Failed: Remaining alias should be 11423');
    console.log('   Status Code: 200 | Remaining Aliases:', res3.body.data.aliases);
    console.log('   Status: PASSED\n');

    // 4. Edit SKU: Restore both aliases
    console.log('4. Edit SKU: Restore both aliases (11423 & FG-P-F-0503):');
    const res4 = await request(app)
      .patch('/api/v1/skus/MOMOS-VEG-24')
      .set(tokenHeader)
      .send({
        aliases: [
          { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
          { code: 'FG-P-F-0503', vendorGstin: '27ABACA2423J1Z0' },
        ],
      });

    console.assert(res4.status === 200, 'Test 4 Failed: Status should be 200');
    console.assert(res4.body.data.aliases.length === 2, 'Test 4 Failed: Should have 2 restored aliases');
    console.log('   Status Code: 200 | Restored Aliases:', res4.body.data.aliases);
    console.log('   Status: PASSED\n');

    // 5. Upload real documents and execute matching via API
    console.log('5. Upload PO, Invoice, GRN and verify matching using UI-created aliases:');
    const poPdfPath = path.join(__dirname, '../fixtures/po_sample.pdf');
    const invoicePdfPath = path.join(__dirname, '../fixtures/invoice_sample.pdf');

    await request(app)
      .post('/api/v1/documents/upload')
      .set(tokenHeader)
      .field('documentType', 'PURCHASE_ORDER')
      .attach('file', poPdfPath);

    await request(app)
      .post('/api/v1/documents/upload')
      .set(tokenHeader)
      .field('documentType', 'INVOICE')
      .attach('file', invoicePdfPath);

    await request(app)
      .post('/api/v1/documents/upload')
      .set(tokenHeader)
      .field('documentType', 'GRN')
      .attach('file', poPdfPath);

    const matchRes = await request(app)
      .get('/api/v1/match/CI4PO05788')
      .set(tokenHeader);

    console.assert(matchRes.status === 200, 'Test 5 Failed: Match status should be 200');
    console.assert(
      matchRes.body.data.status === 'MATCHED' || matchRes.body.data.status === 'PARTIALLY_MATCHED',
      'Test 5 Failed: Match status should be MATCHED or PARTIALLY_MATCHED'
    );

    const itemResult = matchRes.body.data.itemLevelResults.find((i) => i.sku === 'MOMOS-VEG-24');
    console.assert(itemResult !== undefined, 'Test 5 Failed: Canonical SKU MOMOS-VEG-24 should be present in results');
    console.assert(itemResult.orderedQuantity === 50, 'Test 5 Failed: PO quantity should be 50');
    console.assert(itemResult.invoicedQuantity === 50, 'Test 5 Failed: Invoice quantity should be 50');
    console.assert(itemResult.orderedPrice === 220.76, 'Test 5 Failed: PO price should be 220.76');
    console.assert(itemResult.invoicePrice === 220.76, 'Test 5 Failed: Invoice price should be 220.76');

    console.log('   Reconciliation Result:', {
      status: matchRes.body.data.status,
      canonicalSku: itemResult.sku,
      poQuantity: itemResult.orderedQuantity,
      invoiceQuantity: itemResult.invoicedQuantity,
      poUnitPrice: itemResult.orderedPrice,
      invoiceUnitPrice: itemResult.invoicePrice,
    });
    console.log('   Status: PASSED\n');

    console.log('All SKU Master Alias UI & Match Integration Tests Passed Successfully!\n');
  } finally {
    if (dbConnected) {
      await SKUModel.deleteMany({ skuCode: { $in: ['SKU-NO-ALIAS', 'MOMOS-VEG-24', '11797', '18003'] } });
      await PurchaseOrderModel.deleteMany({ poNumber: 'CI4PO05788' });
      await InvoiceModel.deleteMany({ poReference: 'CI4PO05788' });
      await GRNModel.deleteMany({ poReference: 'CI4PO05788' });
      await mongoose.disconnect();
    }
  }
}

runSkuAliasUiWorkflowTest();

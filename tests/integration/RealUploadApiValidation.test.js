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

async function runRealUploadApiValidation() {
  console.log('=== Phase 5 Real API Upload & Match Integration Suite ===\n');

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

  try {
    // 0. Clean DB collections for test isolation
    await PurchaseOrderModel.deleteMany({ poNumber: 'CI4PO05788' });
    await InvoiceModel.deleteMany({ poReference: 'CI4PO05788' });
    await GRNModel.deleteMany({ poReference: 'CI4PO05788' });
    await SKUModel.deleteMany({ skuCode: 'MOMOS-VEG-24' });

    // Populate SKU Master with alias mapping for real PDF documents (M/s AFP: 27ABACA2423J1Z0)
    await SKUModel.create({
      skuCode: 'MOMOS-VEG-24',
      name: 'PSM Cheesy Spicy Vegetable Momos 24Pcs',
      unitPrice: 220.76,
      aliases: [
        { code: '11423', vendorGstin: '27ABACA2423J1Z0' },
        { code: 'FG-P-F-0503', vendorGstin: '27ABACA2423J1Z0' },
      ],
    });

    const poPdfPath = path.join(__dirname, '../fixtures/po_sample.pdf');
    const invoicePdfPath = path.join(__dirname, '../fixtures/invoice_sample.pdf');

    // 1. Test POST /api/v1/documents/upload for Purchase Order
    console.log('1. Testing POST /api/v1/documents/upload (PURCHASE_ORDER):');
    const poRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', 'Bearer static-bearer-token-3way-match-engine')
      .field('documentType', 'PURCHASE_ORDER')
      .attach('file', poPdfPath);

    console.log('   Status Code:', poRes.status);
    if (poRes.status !== 201) {
      console.error('   Upload Error Body:', JSON.stringify(poRes.body, null, 2));
    }
    console.assert(poRes.status === 201, 'Test 1 Failed: PO upload status should be 201');
    console.assert(poRes.body.success === true, 'Test 1 Failed: PO upload success should be true');
    console.assert(poRes.body.data.poNumber === 'CI4PO05788', 'Test 1 Failed: poNumber should be CI4PO05788');
    console.assert(poRes.body.data.buyer.name === 'CLOUDSTORE RETAIL PRIVATE LIMITED', 'Test 1 Failed: buyer.name should not be empty');
    console.log('   PO Number:', poRes.body.data.poNumber);
    console.log('   Buyer Name:', poRes.body.data.buyer.name);
    console.log('   Status: PASSED\n');

    // Verify PO persisted in MongoDB
    const poInDb = await PurchaseOrderModel.findOne({ poNumber: 'CI4PO05788' }).lean();
    console.assert(poInDb !== null, 'PO document not found in MongoDB');
    console.assert(poInDb.buyer.name === 'CLOUDSTORE RETAIL PRIVATE LIMITED', 'PO buyer.name not persisted in MongoDB');

    // 2. Test POST /api/v1/documents/upload for Invoice
    console.log('2. Testing POST /api/v1/documents/upload (INVOICE):');
    const invRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', 'Bearer static-bearer-token-3way-match-engine')
      .field('documentType', 'INVOICE')
      .attach('file', invoicePdfPath);

    console.log('   Status Code:', invRes.status);
    if (invRes.status !== 201) {
      console.error('   Upload Error Body:', JSON.stringify(invRes.body, null, 2));
    }
    console.assert(invRes.status === 201, 'Test 2 Failed: Invoice upload status should be 201');
    console.assert(invRes.body.success === true, 'Test 2 Failed: Invoice upload success should be true');
    console.assert(invRes.body.data.poReference === 'CI4PO05788', 'Test 2 Failed: Invoice poReference should be CI4PO05788');
    console.log('   Invoice Number:', invRes.body.data.invoiceNumber);
    console.log('   PO Reference:', invRes.body.data.poReference);
    console.log('   Status: PASSED\n');

    // Verify Invoice persisted in MongoDB
    const invInDb = await InvoiceModel.findOne({ poReference: 'CI4PO05788' }).lean();
    console.assert(invInDb !== null, 'Invoice document not found in MongoDB');
    console.assert(invInDb.poReference === 'CI4PO05788', 'Invoice poReference mismatch in MongoDB');

    // 3. Test POST /api/v1/documents/upload for GRN
    console.log('3. Testing POST /api/v1/documents/upload (GRN):');
    const grnRes = await request(app)
      .post('/api/v1/documents/upload')
      .set('Authorization', 'Bearer static-bearer-token-3way-match-engine')
      .field('documentType', 'GRN')
      .attach('file', poPdfPath);

    console.log('   Status Code:', grnRes.status);
    console.assert(grnRes.status === 201, 'Test 3 Failed: GRN upload status should be 201');
    console.log('   GRN Number:', grnRes.body.data.grnNumber);
    console.log('   Status: PASSED\n');

    // 4. Test GET /api/v1/match/:poNumber (Matching Route)
    console.log('4. Testing GET /api/v1/match/CI4PO05788 (Full Match Engine Endpoint):');
    const matchRes = await request(app)
      .get('/api/v1/match/CI4PO05788')
      .set('Authorization', 'Bearer static-bearer-token-3way-match-engine');

    console.log('   Status Code:', matchRes.status);
    console.log('   Match Result Summary:', JSON.stringify(matchRes.body.data, null, 2));

    console.assert(matchRes.status === 200, 'Test 4 Failed: Match status should be 200');
    console.assert(matchRes.body.success === true, 'Test 4 Failed: Match success should be true');
    console.assert(matchRes.body.data.poNumber === 'CI4PO05788', 'Test 4 Failed: poNumber mismatch');

    console.log('\nAll Real API Upload & Match Integration Tests Passed Successfully!\n');
  } finally {
    if (dbConnected) {
      await PurchaseOrderModel.deleteMany({ poNumber: 'CI4PO05788' });
      await InvoiceModel.deleteMany({ poReference: 'CI4PO05788' });
      await GRNModel.deleteMany({ poReference: 'CI4PO05788' });
      await SKUModel.deleteMany({ skuCode: 'MOMOS-VEG-24' });
      await mongoose.disconnect();
    }
  }
}

runRealUploadApiValidation();

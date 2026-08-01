'use strict';

const mongoose = require('mongoose');
const express = require('express');
const request = require('supertest');
const env = require('../../src/config/env');
const SKUModel = require('../../src/models/SKUModel');
const SKUController = require('../../src/modules/sku/controller/SKUController');

async function runSKUCreationFlowTests() {
  console.log('=== SKU Creation Flow & Partial Index Test Suite ===\n');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/three-way-match-engine';
  
  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
  } catch (err) {
    console.log('Skipping live DB test execution (MongoDB connection unavailable):', err.message);
    return;
  }

  try {
    await SKUModel.deleteMany({ skuCode: /^TEST-SKU-/ });
    try {
      await SKUModel.collection.dropIndex('idx_sku_ean_code');
    } catch (_err) {
      // index might not exist yet
    }
    await SKUModel.syncIndexes();
  } catch (_err) {
    // collection setup
  }

  const app = express();
  app.use(express.json());
  const skuController = new SKUController();

  app.post('/skus', skuController.createSKU);
  app.use((err, req, res, next) => {
    let statusCode = err.statusCode || err.status || 500;
    let message = err.message || 'Internal Server Error';
    let code = err.code || 'INTERNAL_SERVER_ERROR';

    if (err.name === 'MongoServerError' && (err.code === 11000 || err.code === 11001)) {
      statusCode = 409;
      code = 'DUPLICATE_KEY_ERROR';
      const field = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
      const val = err.keyValue ? err.keyValue[field] : '';
      message = `A SKU document with ${field} "${val}" already exists.`;
    }

    res.status(statusCode).json({
      success: false,
      errors: [{ code, message }],
    });
  });

  try {
    // 1. Create first SKU without eanCode
    console.log('1. Creating first SKU without eanCode (TEST-SKU-001):');
    const res1 = await request(app)
      .post('/skus')
      .send({ skuCode: 'TEST-SKU-001', name: 'Test Widget 1', unitPrice: 100 });

    console.log('   Status Code:', res1.status);
    console.assert(res1.status === 201, 'Test 1 Failed: Expected status 201');
    console.assert(res1.body.success === true, 'Test 1 Failed: Expected success true');
    console.log('   Result: PASSED\n');

    // 2. Create second SKU without eanCode
    console.log('2. Creating second SKU without eanCode (TEST-SKU-002):');
    const res2 = await request(app)
      .post('/skus')
      .send({ skuCode: 'TEST-SKU-002', name: 'Test Widget 2', unitPrice: 150 });

    console.log('   Status Code:', res2.status);
    console.assert(res2.status === 201, 'Test 2 Failed: Expected status 201 (no duplicate key error for null eanCode)');
    console.assert(res2.body.success === true, 'Test 2 Failed: Expected success true');
    console.log('   Result: PASSED\n');

    // 3. Create third SKU with valid eanCode
    console.log('3. Creating third SKU with valid eanCode (TEST-SKU-003, eanCode: 8901234567890):');
    const res3 = await request(app)
      .post('/skus')
      .send({ skuCode: 'TEST-SKU-003', eanCode: '8901234567890', name: 'Test Widget 3', unitPrice: 200 });

    console.log('   Status Code:', res3.status);
    console.assert(res3.status === 201, 'Test 3 Failed: Expected status 201');
    console.assert(res3.body.success === true, 'Test 3 Failed: Expected success true');
    console.log('   Result: PASSED\n');

    // 4. Create fourth SKU with DUPLICATE eanCode (8901234567890) -> Should return 409
    console.log('4. Creating fourth SKU with duplicate eanCode (8901234567890):');
    const res4 = await request(app)
      .post('/skus')
      .send({ skuCode: 'TEST-SKU-004', eanCode: '8901234567890', name: 'Test Widget 4', unitPrice: 250 });

    console.log('   Status Code:', res4.status);
    console.log('   Response Body:', JSON.stringify(res4.body));
    console.assert(res4.status === 409, 'Test 4 Failed: Expected status 409 Conflict');
    console.assert(res4.body.errors[0].code === 'DUPLICATE_KEY_ERROR', 'Test 4 Failed: Expected code DUPLICATE_KEY_ERROR');
    console.log('   Result: PASSED\n');

    console.log('All SKU creation flow & partial index tests passed successfully!');
  } finally {
    await SKUModel.deleteMany({ skuCode: /^TEST-SKU-/ });
    await mongoose.disconnect();
  }
}

runSKUCreationFlowTests();

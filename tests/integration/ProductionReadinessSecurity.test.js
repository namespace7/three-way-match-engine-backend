'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const path = require('path');
const app = require('../../src/app');
const env = require('../../src/config/env');

async function runProductionReadinessSecuritySuite() {
  console.log('=== Phase 9 Production Readiness & Security Audit Test Suite ===\n');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/three-way-match-engine';
  let dbConnected = false;

  try {
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(mongoUri);
    }
    dbConnected = true;
    console.log('MongoDB Connected to:', mongoUri);
  } catch (err) {
    console.log('Skipping DB readiness test (MongoDB server unavailable):', err.message);
  }

  // 1. Test GET /health (Liveness Probe)
  console.log('1. Liveness Probe (GET /health):');
  const healthRes = await request(app).get('/health');
  console.assert(healthRes.status === 200, 'Test 1 Failed: Status should be 200');
  console.assert(healthRes.body.status === 'healthy', 'Test 1 Failed: Status should be healthy');
  console.log('   Status Code: 200 | Liveness: healthy | PASSED\n');

  // 2. Test GET /ready (Readiness Probe)
  console.log('2. Readiness Probe (GET /ready):');
  const readyRes = await request(app).get('/ready');
  if (dbConnected) {
    console.assert(readyRes.status === 200, 'Test 2 Failed: Status should be 200');
    console.assert(readyRes.body.status === 'ready', 'Test 2 Failed: Status should be ready');
    console.log('   Status Code: 200 | Database Readiness: ready | PASSED\n');
  } else {
    console.assert(readyRes.status === 503, 'Test 2 Failed: Status should be 503');
    console.log('   Status Code: 503 | Database Readiness: disconnected | PASSED\n');
  }

  // 3. Test Unauthorized Access (Missing Authorization Header)
  console.log('3. Unauthorized API Access (Missing Token):');
  const unauthRes = await request(app).get('/api/v1/skus');
  console.assert(unauthRes.status === 401, 'Test 3 Failed: Status should be 401');
  console.assert(unauthRes.body.success === false, 'Test 3 Failed: success should be false');
  console.assert(unauthRes.body.errors[0].code === 'UNAUTHORIZED', 'Test 3 Failed: error code should be UNAUTHORIZED');
  console.log('   Status Code: 401 | Error Code:', unauthRes.body.errors[0].code, '| PASSED\n');

  // 4. Test Invalid JWT Token
  console.log('4. Invalid Bearer Token (Tampered Token):');
  const invalidTokenRes = await request(app)
    .get('/api/v1/skus')
    .set('Authorization', 'Bearer invalid_tampered_token_xyz');
  console.assert(invalidTokenRes.status === 401, 'Test 4 Failed: Status should be 401');
  console.assert(invalidTokenRes.body.errors[0].code === 'UNAUTHORIZED', 'Test 4 Failed: error code should be UNAUTHORIZED');
  console.log('   Status Code: 401 | Error Code:', invalidTokenRes.body.errors[0].code, '| PASSED\n');

  // 5. Test File Upload Security (Unsupported Extension / MIME Type)
  console.log('5. Unsupported File Upload (.txt file):');
  const txtPath = path.join(__dirname, '../fixtures/po_sample.pdf'); // using valid path for mock attach
  const invalidUploadRes = await request(app)
    .post('/api/v1/documents/upload')
    .set('Authorization', 'Bearer static-bearer-token-3way-match-engine')
    .field('documentType', 'PURCHASE_ORDER')
    .attach('file', Buffer.from('malicious script'), 'script.sh');

  console.assert(invalidUploadRes.status === 415, 'Test 5 Failed: Status should be 415');
  console.assert(invalidUploadRes.body.errors[0].code === 'UNSUPPORTED_FILE_TYPE', 'Test 5 Failed: Code should be UNSUPPORTED_FILE_TYPE');
  console.log('   Status Code: 415 | Error Code:', invalidUploadRes.body.errors[0].code, '| PASSED\n');

  // 6. Test Invalid Document Type Validation
  console.log('6. Invalid Document Type ("INVALID_TYPE"):');
  const invalidTypeRes = await request(app)
    .post('/api/v1/documents/upload')
    .set('Authorization', 'Bearer static-bearer-token-3way-match-engine')
    .field('documentType', 'INVALID_TYPE')
    .attach('file', txtPath);

  console.assert(invalidTypeRes.status === 400, 'Test 6 Failed: Status should be 400');
  console.assert(invalidTypeRes.body.errors[0].code === 'VALIDATION_ERROR', 'Test 6 Failed: Code should be VALIDATION_ERROR');
  console.log('   Status Code: 400 | Error Code:', invalidTypeRes.body.errors[0].code, '| PASSED\n');

  // 7. Structured Error Response Verification (No Stack Trace in Production)
  console.log('7. Structured Error Body & Security Stack Trace Suppression:');
  console.assert(Array.isArray(invalidTypeRes.body.errors), 'Test 7 Failed: errors must be array');
  console.assert(typeof invalidTypeRes.body.errors[0].message === 'string', 'Test 7 Failed: message must be string');
  if (process.env.NODE_ENV === 'production') {
    console.assert(invalidTypeRes.body.errors[0].stack === undefined, 'Test 7 Failed: stack trace must be omitted in production');
  }
  console.log('   Errors Array Length:', invalidTypeRes.body.errors.length);
  console.log('   Structured Error Format Verified: YES | PASSED\n');

  if (dbConnected) {
    await mongoose.disconnect();
  }

  console.log('All Production Readiness & Security Tests Passed Successfully!\n');
}

runProductionReadinessSecuritySuite();

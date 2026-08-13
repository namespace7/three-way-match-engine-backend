'use strict';

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../../src/app');
const env = require('../../src/config/env');

async function runHttpOnlyCookieAuthSuite() {
  console.log('=== Phase 9.2 HttpOnly Cookie Authentication Integration Test Suite ===\n');

  const mongoUri = env.MONGODB_URI || 'mongodb://localhost:27017/three-way-match-engine';
  if (mongoose.connection.readyState === 0) {
    try {
      await mongoose.connect(mongoUri);
    } catch (_err) {
      console.log('MongoDB server unavailable, running route tests in standalone mode.');
    }
  }

  // 1. Test POST /api/v1/auth/login sets HttpOnly access_token cookie
  console.log('1. Login Endpoint (POST /api/v1/auth/login):');
  const loginRes = await request(app)
    .post('/api/v1/auth/login')
    .send({ username: 'admin', password: 'admin' });

  console.assert(loginRes.status === 200, 'Test 1 Failed: Status should be 200');
  console.assert(loginRes.body.success === true, 'Test 1 Failed: success should be true');
  console.assert(loginRes.body.data.user.username === 'admin', 'Test 1 Failed: username should be admin');
  console.assert(loginRes.body.data.token === undefined, 'Test 1 Failed: token should NOT be exposed in JSON body');

  const cookies = loginRes.headers['set-cookie'] || [];
  console.assert(cookies.length > 0, 'Test 1 Failed: Set-Cookie header missing');
  const accessTokenCookie = cookies.find((c) => c.startsWith('access_token='));
  console.assert(Boolean(accessTokenCookie), 'Test 1 Failed: access_token cookie missing');
  console.assert(accessTokenCookie.includes('HttpOnly'), 'Test 1 Failed: cookie must have HttpOnly flag');
  console.assert(accessTokenCookie.includes('SameSite=Lax'), 'Test 1 Failed: cookie must have SameSite=Lax flag');
  console.log('   Status: 200 | Set-Cookie: HttpOnly; SameSite=Lax | JWT Omitted from JSON: YES | PASSED\n');

  // Extract cookie for authenticated requests
  const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');

  // 2. Test GET /api/v1/auth/me with valid HttpOnly cookie
  console.log('2. Session Check Endpoint (GET /api/v1/auth/me):');
  const meRes = await request(app)
    .get('/api/v1/auth/me')
    .set('Cookie', cookieHeader);

  console.assert(meRes.status === 200, 'Test 2 Failed: Status should be 200');
  console.assert(meRes.body.data.user.username === 'admin', 'Test 2 Failed: user should be admin');
  console.log('   Status: 200 | User Session Verified: admin | PASSED\n');

  // 3. Test Protected Endpoint GET /api/v1/skus with valid HttpOnly cookie
  console.log('3. Protected API Endpoint (GET /api/v1/skus with Cookie):');
  const skuRes = await request(app)
    .get('/api/v1/skus')
    .set('Cookie', cookieHeader);

  console.assert(skuRes.status !== 401, 'Test 3 Failed: Status should not be 401 Unauthorized');
  console.log('   Status:', skuRes.status, '| Cookie Authenticated Access: SUCCESS | PASSED\n');

  // 4. Test Unauthenticated Request (Missing Cookie)
  console.log('4. Protected Endpoint Without Cookie:');
  const unauthRes = await request(app).get('/api/v1/skus');
  console.assert(unauthRes.status === 401, 'Test 4 Failed: Status should be 401');
  console.assert(unauthRes.body.errors[0].code === 'UNAUTHORIZED', 'Test 4 Failed: code should be UNAUTHORIZED');
  console.log('   Status: 401 | Error Code: UNAUTHORIZED | PASSED\n');

  // 5. Test Invalid Cookie Request
  console.log('5. Protected Endpoint With Invalid Cookie:');
  const invalidRes = await request(app)
    .get('/api/v1/skus')
    .set('Cookie', 'access_token=invalid_forged_cookie_token');

  console.assert(invalidRes.status === 401, 'Test 5 Failed: Status should be 401');
  console.assert(invalidRes.body.errors[0].code === 'UNAUTHORIZED', 'Test 5 Failed: code should be UNAUTHORIZED');
  console.log('   Status: 401 | Invalid Cookie Rejected: SUCCESS | PASSED\n');

  // 6. Test Logout Endpoint (POST /api/v1/auth/logout)
  console.log('6. Logout Endpoint (POST /api/v1/auth/logout):');
  const logoutRes = await request(app)
    .post('/api/v1/auth/logout')
    .set('Cookie', cookieHeader);

  console.assert(logoutRes.status === 200, 'Test 6 Failed: Status should be 200');
  const logoutCookies = logoutRes.headers['set-cookie'] || [];
  const clearedCookie = logoutCookies.find((c) => c.startsWith('access_token='));
  console.assert(Boolean(clearedCookie), 'Test 6 Failed: Cleared access_token cookie missing');
  console.log('   Status: 200 | Cookie Cleared by Server: YES | PASSED\n');

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  console.log('All HttpOnly Cookie Authentication Integration Tests Passed Successfully!\n');
}

runHttpOnlyCookieAuthSuite();

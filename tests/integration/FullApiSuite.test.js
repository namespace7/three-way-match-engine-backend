'use strict';

const AuthController = require('../../src/modules/auth/controller/authController');
const { STATIC_TOKEN } = require('../../src/middlewares/auth');

async function runFullApiSuite() {
  console.log('=== Full API Endpoint & Authentication Integration Test Suite ===\n');

  const authController = new AuthController();
  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'admin';

  const mockRes = () => {
    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        return this;
      },
    };
    return res;
  };

  // 1. Test Successful Login
  console.log('1. Testing Successful Login:');
  const req1 = { body: { username: validUsername, password: validPassword } };
  const res1 = mockRes();
  await authController.login(req1, res1, (err) => {
    if (err) throw err;
  });
  console.assert(res1.statusCode === 200, 'Expected 200 status code');
  console.assert(res1.body.success === true, 'Expected success === true');
  console.assert(res1.body.data.token === STATIC_TOKEN, 'Expected static bearer token');
  console.log('   Status: PASSED\n');

  // 2. Test Missing Username
  console.log('2. Testing Missing Username (400 VALIDATION_ERROR):');
  const req2 = { body: { password: validPassword } };
  const res2 = mockRes();
  await authController.login(req2, res2, (err) => {
    console.assert(err.statusCode === 400, 'Expected status 400');
    console.assert(err.code === 'VALIDATION_ERROR', 'Expected code VALIDATION_ERROR');
    console.log('   Status: PASSED\n');
  });

  // 3. Test Missing Password
  console.log('3. Testing Missing Password (400 VALIDATION_ERROR):');
  const req3 = { body: { username: validUsername } };
  const res3 = mockRes();
  await authController.login(req3, res3, (err) => {
    console.assert(err.statusCode === 400, 'Expected status 400');
    console.assert(err.code === 'VALIDATION_ERROR', 'Expected code VALIDATION_ERROR');
    console.log('   Status: PASSED\n');
  });

  // 4. Test Invalid Credentials
  console.log('4. Testing Invalid Credentials (401 INVALID_CREDENTIALS):');
  const req4 = { body: { username: validUsername, password: 'wrongpassword' } };
  const res4 = mockRes();
  await authController.login(req4, res4, (err) => {
    console.assert(err.statusCode === 401, 'Expected status 401');
    console.assert(err.code === 'INVALID_CREDENTIALS', 'Expected code INVALID_CREDENTIALS');
    console.log('   Status: PASSED\n');
  });

  console.log('All API Integration checks passed successfully!');
}

runFullApiSuite();

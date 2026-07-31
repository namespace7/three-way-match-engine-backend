'use strict';

const request = require('supertest');
const app = require('../../src/app');
const { STATIC_TOKEN } = require('../../src/middlewares/auth');

describe('POST /auth/login Authentication API', () => {
  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'admin';

  test('✓ Successful login with valid credentials returns static token', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        username: validUsername,
        password: validPassword,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toBeDefined();
    expect(res.body.data.token).toBe(STATIC_TOKEN);
    expect(res.body.data.type).toBe('Bearer');
  });

  test('✓ Missing username returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        password: validPassword,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].code).toBe('VALIDATION_ERROR');
    expect(res.body.errors[0].message).toBe('Username and password are required.');
  });

  test('✓ Missing password returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        username: validUsername,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].code).toBe('VALIDATION_ERROR');
    expect(res.body.errors[0].message).toBe('Username and password are required.');
  });

  test('✓ Invalid credentials return 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({
        username: validUsername,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errors).toBeDefined();
    expect(res.body.errors[0].code).toBe('INVALID_CREDENTIALS');
    expect(res.body.errors[0].message).toBe('Invalid username or password.');
  });
});

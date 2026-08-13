'use strict';

const request = require('supertest');
const app = require('../../src/app');

describe('HttpOnly Cookie Authentication API (POST /auth/login, GET /auth/me, POST /auth/logout)', () => {
  const validUsername = process.env.AUTH_USERNAME || 'admin';
  const validPassword = process.env.AUTH_PASSWORD || 'admin';

  test('✓ Successful login sets HttpOnly access_token cookie & omits token from JSON body', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: validUsername,
        password: validPassword,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.username).toBe(validUsername);
    expect(res.body.data.token).toBeUndefined();

    const cookies = res.headers['set-cookie'] || [];
    expect(cookies.length).toBeGreaterThan(0);
    const accessTokenCookie = cookies.find((c) => c.startsWith('access_token='));
    expect(accessTokenCookie).toBeDefined();
    expect(accessTokenCookie).toContain('HttpOnly');
    expect(accessTokenCookie).toContain('SameSite=Lax');
  });

  test('✓ GET /api/v1/auth/me succeeds with valid access_token cookie', async () => {
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: validUsername,
        password: validPassword,
      });

    const cookies = loginRes.headers['set-cookie'] || [];
    const cookieHeader = cookies.map((c) => c.split(';')[0]).join('; ');

    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Cookie', cookieHeader);

    expect(meRes.statusCode).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user).toBeDefined();
  });

  test('✓ GET /api/v1/auth/me returns 401 UNAUTHORIZED when cookie is missing', async () => {
    const meRes = await request(app).get('/api/v1/auth/me');

    expect(meRes.statusCode).toBe(401);
    expect(meRes.body.success).toBe(false);
    expect(meRes.body.errors[0].code).toBe('UNAUTHORIZED');
  });

  test('✓ POST /api/v1/auth/logout clears access_token cookie', async () => {
    const logoutRes = await request(app).post('/api/v1/auth/logout');

    expect(logoutRes.statusCode).toBe(200);
    const cookies = logoutRes.headers['set-cookie'] || [];
    const clearedCookie = cookies.find((c) => c.startsWith('access_token='));
    expect(clearedCookie).toBeDefined();
  });

  test('✓ Missing username returns 400 VALIDATION_ERROR', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        password: validPassword,
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe('VALIDATION_ERROR');
  });

  test('✓ Invalid credentials return 401 INVALID_CREDENTIALS', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({
        username: validUsername,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.errors[0].code).toBe('INVALID_CREDENTIALS');
  });
});

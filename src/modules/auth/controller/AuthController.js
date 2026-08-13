'use strict';

const jwt = require('jsonwebtoken');
const { STATIC_TOKEN } = require('../../../middlewares/auth');
const env = require('../../../config/env');

/**
 * @class AuthController
 *
 * Handles HTTP authentication requests using server-set HttpOnly cookies.
 */
class AuthController {
  login = async (req, res, next) => {
    try {
      const { username, password } = req.body || {};

      if (
        !username ||
        !password ||
        typeof username !== 'string' ||
        typeof password !== 'string' ||
        username.trim() === '' ||
        password.trim() === ''
      ) {
        const error = new Error('Username and password are required.');
        error.statusCode = 400;
        error.code = 'VALIDATION_ERROR';
        throw error;
      }

      const expectedUsername = (process.env.AUTH_USERNAME || env.AUTH_USERNAME || 'admin').trim();
      const expectedPassword = (process.env.AUTH_PASSWORD || env.AUTH_PASSWORD || 'admin').trim();

      if (username.trim() !== expectedUsername || password.trim() !== expectedPassword) {
        const error = new Error('Invalid username or password.');
        error.statusCode = 401;
        error.code = 'INVALID_CREDENTIALS';
        throw error;
      }

      const token = jwt.sign(
        { username: expectedUsername, role: 'admin' },
        env.JWT_SECRET || 'dev-secret-key-3way-match',
        { expiresIn: '24h' }
      );

      const isProd = process.env.NODE_ENV === 'production' || env.isProduction;
      const cookieOptions = {
        httpOnly: true,
        secure: isProd,
        sameSite: 'lax',
        path: '/',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      };

      res.cookie('access_token', token, cookieOptions);
      // Clear stale legacy auth_token cookie if present on existing browsers
      res.clearCookie('auth_token', { path: '/', httpOnly: true, sameSite: 'lax' });

      return res.status(200).json({
        success: true,
        data: {
          user: { username: expectedUsername, role: 'admin' },
          message: 'Authentication successful',
        },
      });
    } catch (err) {
      next(err);
    }
  };

  logout = async (req, res, next) => {
    try {
      const cookieOptions = {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
      };

      res.clearCookie('access_token', cookieOptions);
      res.clearCookie('auth_token', cookieOptions);

      return res.status(200).json({
        success: true,
        message: 'Logged out successfully',
      });
    } catch (err) {
      next(err);
    }
  };

  getMe = async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      const token =
        req.cookies?.access_token ||
        (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

      if (!token) {
        const error = new Error('Authentication required.');
        error.statusCode = 401;
        error.code = 'UNAUTHORIZED';
        throw error;
      }

      let user = { username: 'admin', role: 'admin' };
      if (token !== STATIC_TOKEN) {
        user = jwt.verify(token, env.JWT_SECRET || 'dev-secret-key-3way-match');
      }

      return res.status(200).json({
        success: true,
        data: { user },
      });
    } catch (err) {
      const error = new Error('Invalid or expired authentication session.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      next(error);
    }
  };
}

module.exports = AuthController;

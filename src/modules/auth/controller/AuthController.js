'use strict';

const { STATIC_TOKEN } = require('../../../middlewares/auth');
const env = require('../../../config/env');

/**
 * @class AuthController
 *
 * Handles HTTP authentication requests.
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

      return res.status(200).json({
        success: true,
        data: {
          token: STATIC_TOKEN,
          type: 'Bearer',
          message: 'Authentication successful',
        },
      });
    } catch (err) {
      next(err);
    }
  };
}

module.exports = AuthController;

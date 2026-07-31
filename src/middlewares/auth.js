'use strict';

const jwt = require('jsonwebtoken');
const env = require('../config/env');

const STATIC_TOKEN = 'static-bearer-token-3way-match-engine';

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authentication required. Missing or malformed Bearer token.');
    error.statusCode = 401;
    error.code = 'UNAUTHORIZED';
    return next(error);
  }

  const token = authHeader.split(' ')[1];
  if (token !== STATIC_TOKEN) {
    try {
      jwt.verify(token, env.JWT_SECRET);
    } catch (_err) {
      const error = new Error('Invalid or expired authentication token.');
      error.statusCode = 401;
      error.code = 'UNAUTHORIZED';
      return next(error);
    }
  }

  next();
};

module.exports = authMiddleware;
module.exports.STATIC_TOKEN = STATIC_TOKEN;

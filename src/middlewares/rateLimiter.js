'use strict';

const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const buildRateLimitError = (message) => {
  const err = new Error(message);
  err.statusCode = 429;
  err.code = 'RATE_LIMIT_EXCEEDED';
  return err;
};

/** Rate limiter for authentication login endpoint */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 1000 : 15, // 15 requests per 15 mins in production/dev
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(buildRateLimitError('Too many login attempts. Please try again after 15 minutes.'));
  },
});

/** Rate limiter for document upload endpoint */
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 1000 : 30, // 30 uploads per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(buildRateLimitError('Too many document upload requests. Please try again after 15 minutes.'));
  },
});

/** General API rate limiter */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: env.isTest ? 5000 : 300, // 300 requests per 15 mins
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next) => {
    next(buildRateLimitError('Too many API requests. Please try again later.'));
  },
});

module.exports = {
  authLimiter,
  uploadLimiter,
  apiLimiter,
};

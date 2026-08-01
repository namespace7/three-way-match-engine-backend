const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('express-async-errors');

const env = require('./config/env');
const logger = require('./shared/logger');
const authMiddleware = require('./middlewares/auth');
const authRoutes = require('./modules/auth/routes/AuthRoutes');
const documentRoutes = require('./modules/document/routes/DocumentRoutes');
const matchingRoutes = require('./modules/matching/routes/MatchingRoutes');
const summaryRoutes = require('./modules/summary/routes/SummaryRoutes');
const skuRoutes = require('./modules/sku/routes/SKURoutes');

const app = express();

// Security HTTP headers
app.use(helmet());

// Enable Cross-Origin Resource Sharing
app.use(cors());

// HTTP request logger — 'combined' in production, 'dev' otherwise
app.use(
  morgan(env.isProduction ? 'combined' : 'dev', {
    stream: { write: (message) => logger.info(message.trim()) },
  })
);

// Request body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------------------------------------------------------
// Public / Unprotected Routes
// ---------------------------------------------------------------------------

/** GET /health — lightweight liveness probe */
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

/** Auth routes (unprotected login) */
app.use('/auth', authRoutes);
app.use('/api/v1/auth', authRoutes);

// ---------------------------------------------------------------------------
// Protected API Routes (Requires Bearer token)
// ---------------------------------------------------------------------------

app.use('/api/v1', authMiddleware);

/** Document management routes */
app.use('/api/v1/documents', documentRoutes);

/** Three-way matching routes */
app.use('/api/v1/match', matchingRoutes);

/** Summary dashboard routes */
app.use('/api/v1/summary', summaryRoutes);

/** SKU master CRUD routes */
app.use('/api/v1/skus', skuRoutes);

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

/**
 * Builds a standardized error response body.
 * Stack traces are included ONLY when NODE_ENV === 'development'.
 * In all other environments (production, test, etc.), stack is completely omitted.
 *
 * @param {string} code   - Machine-readable error code.
 * @param {string} message - Human-readable description.
 * @param {string|undefined} stack - Error stack trace.
 * @returns {{ success: false, errors: Array<{ code: string, message: string, stack?: string }> }}
 */
const buildErrorResponse = (code, message, stack) => {
  const isDev = process.env.NODE_ENV === 'development' || env.isDevelopment;
  const errorObject = {
    code,
    message,
  };

  if (isDev && stack) {
    errorObject.stack = stack;
  }

  return {
    success: false,
    errors: [errorObject],
  };
};

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code || 'INTERNAL_SERVER_ERROR';

  // Handle MongoDB E11000 Duplicate Key Error
  if (err.name === 'MongoServerError' && (err.code === 11000 || err.code === 11001)) {
    statusCode = 409;
    code = 'DUPLICATE_KEY_ERROR';

    let fieldName = 'field';
    let duplicateValue = '';
    if (err.keyPattern) {
      fieldName = Object.keys(err.keyPattern)[0];
    }
    if (err.keyValue) {
      duplicateValue = err.keyValue[fieldName];
    }

    const humanField = fieldName === 'skuCode' ? 'SKU Code' : fieldName === 'eanCode' ? 'EAN Code' : fieldName;
    message = duplicateValue
      ? `A SKU document with ${humanField} "${duplicateValue}" already exists.`
      : `A SKU document with conflicting ${humanField} already exists.`;
  }

  logger.error(`[Global Error] ${statusCode} - ${message}`, {
    code,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  return res.status(statusCode).json(buildErrorResponse(code, message, err.stack));
});

module.exports = app;

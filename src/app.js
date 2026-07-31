const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
require('express-async-errors');

const env = require('./config/env');
const logger = require('./shared/logger');
const documentRoutes = require('./modules/document/routes/DocumentRoutes');
const matchingRoutes = require('./modules/matching/routes/MatchingRoutes');

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
// Routes
// ---------------------------------------------------------------------------

/** GET /health — lightweight liveness probe */
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, message: 'Server is running' });
});

/** Document management routes */
app.use('/api/v1/documents', documentRoutes);

/** Three-way matching routes */
app.use('/api/v1/match', matchingRoutes);

// ---------------------------------------------------------------------------
// Global Error Handler
// ---------------------------------------------------------------------------

/**
 * Builds a standardised error response body.
 * @param {string} code   - Machine-readable error code.
 * @param {string} message - Human-readable description.
 * @param {string|undefined} stack - Stack trace included only in development.
 * @returns {{ success: false, errors: Array<{ code: string, message: string, stack?: string }> }}
 */
const buildErrorResponse = (code, message, stack) => ({
  success: false,
  errors: [
    {
      code,
      message,
      ...(env.isDevelopment && stack ? { stack } : {}),
    },
  ],
});

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  logger.error(`[Global Error] ${statusCode} - ${message}`, {
    code,
    path: req.originalUrl,
    method: req.method,
    stack: err.stack,
  });

  res.status(statusCode).json(buildErrorResponse(code, message, err.stack));
});

module.exports = app;

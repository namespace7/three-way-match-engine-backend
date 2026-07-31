const dotenv = require('dotenv');

// Load environment variables from .env file into process.env exactly once
dotenv.config();

/** Variables that MUST be present for the application to start. */
const REQUIRED_ENV_VARS = ['PORT', 'MONGODB_URI', 'JWT_SECRET', 'NODE_ENV'];

/**
 * Checks for missing required environment variables.
 * @throws {Error} A single, descriptive error listing every missing variable.
 */
function validateRequiredVars() {
  const missing = REQUIRED_ENV_VARS.filter((key) => {
    const value = process.env[key];
    return value === undefined || value === null || value.trim() === '';
  });

  if (missing.length > 0) {
    throw new Error(
      `[Config Error] Missing required environment variable(s):\n` +
        missing.map((v) => `  - ${v}`).join('\n') +
        `\nPlease set these variables in your environment or .env file before starting the application.`
    );
  }
}

/**
 * Validates that PORT is a legal TCP port number.
 * @throws {Error} If PORT cannot be parsed or falls outside 1–65535.
 */
function validatePort() {
  const port = parseInt(process.env.PORT, 10);
  if (Number.isNaN(port) || port <= 0 || port > 65535) {
    throw new Error(
      `[Config Error] Invalid PORT value: "${process.env.PORT}". Must be an integer between 1 and 65535.`
    );
  }
}

// Validate at module load time — fail fast before anything else runs
validateRequiredVars();
validatePort();

const nodeEnv = process.env.NODE_ENV.trim();

const config = Object.freeze({
  PORT: parseInt(process.env.PORT, 10),
  MONGODB_URI: process.env.MONGODB_URI.trim(),
  JWT_SECRET: process.env.JWT_SECRET.trim(),
  NODE_ENV: nodeEnv,

  // Optional — defaults applied here so callers never receive undefined
  UPLOAD_DIRECTORY: process.env.UPLOAD_DIRECTORY?.trim() || './uploads',
  GEMINI_API_KEY: process.env.GEMINI_API_KEY?.trim() || null,

  // Convenience booleans derived from NODE_ENV
  isProduction: nodeEnv === 'production',
  isDevelopment: nodeEnv === 'development',
  isTest: nodeEnv === 'test',
});

module.exports = config;

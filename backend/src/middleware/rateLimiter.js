/**
 * src/middleware/rateLimiter.js
 * Rate limiting middleware using express-rate-limit.
 * Two limiters:
 *   - apiLimiter: for all API routes
 *   - authLimiter: stricter for authentication endpoints
 */
const rateLimit = require('express-rate-limit');
const env = require('../config/env');

const apiLimiter = rateLimit({
  windowMs: env.rateLimit.windowMs,
  max: env.rateLimit.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests. Please wait a moment and try again.',
    code: 'RATE_LIMITED',
    errors: [],
  },
  skip: () => env.isTest, // Don't rate-limit during tests
});

const authLimiter = rateLimit({
  windowMs: env.rateLimit.auth.windowMs,
  max: env.rateLimit.auth.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many login attempts. Please wait and try again.',
    code: 'RATE_LIMITED',
    errors: [],
  },
  skip: () => env.isTest,
});

module.exports = { apiLimiter, authLimiter };


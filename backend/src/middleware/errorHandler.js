/**
 * src/middleware/errorHandler.js
 *
 * Centralised error handler. Must be the LAST middleware registered in app.js.
 * Converts all thrown errors into consistent JSON responses.
 * Never returns stack traces or raw DB errors to production clients.
 */
const { Prisma } = require('@prisma/client');
const logger = require('../utils/logger');
const env = require('../config/env');

const errorHandler = (err, req, res, _next) => {
  // ── Prisma known request errors ────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === 'P2002') {
      const field = err.meta?.target || 'field';
      return res.status(409).json({
        success: false,
        message: `A record with this ${Array.isArray(field) ? field.join(', ') : field} already exists.`,
        code: 'CONFLICT',
        errors: [],
      });
    }
    // Record not found
    if (err.code === 'P2025') {
      return res.status(404).json({
        success: false,
        message: 'Record not found.',
        code: 'NOT_FOUND',
        errors: [],
      });
    }
    // Foreign key constraint
    if (err.code === 'P2003') {
      return res.status(400).json({
        success: false,
        message: 'Related record does not exist.',
        code: 'BAD_REQUEST',
        errors: [],
      });
    }

    logger.error('Prisma known error:', { code: err.code, meta: err.meta, url: req.url });
    return res.status(500).json({
      success: false,
      message: 'A database error occurred.',
      code: 'DATABASE_ERROR',
      errors: [],
    });
  }

  // ── Prisma validation errors ───────────────────────────────────────────────
  if (err instanceof Prisma.PrismaClientValidationError) {
    logger.error('Prisma validation error:', { url: req.url, message: err.message });
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided to the database.',
      code: 'BAD_REQUEST',
      errors: [],
    });
  }

  // ── Custom application errors ──────────────────────────────────────────────
  if (err.statusCode) {
    // ValidationError has an errors array
    return res.status(err.statusCode).json({
      success: false,
      message: err.message,
      code: err.code || 'ERROR',
      errors: err.errors || [],
    });
  }

  // ── JWT errors (from jsonwebtoken, not our custom class) ──────────────────
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired authentication token.',
      code: 'UNAUTHORIZED',
      errors: [],
    });
  }

  // ── Multer errors ──────────────────────────────────────────────────────────
  if (err.name === 'MulterError') {
    return res.status(400).json({
      success: false,
      message: `File upload error: ${err.message}`,
      code: 'UPLOAD_ERROR',
      errors: [],
    });
  }

  // ── Unhandled / unexpected errors ─────────────────────────────────────────
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
  });

  return res.status(500).json({
    success: false,
    message: env.isProd
      ? 'An unexpected error occurred. Please try again later.'
      : err.message,
    code: 'INTERNAL_SERVER_ERROR',
    errors: [],
    // Only include stack in development
    ...(env.isDev && { stack: err.stack }),
  });
};

module.exports = errorHandler;


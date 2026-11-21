/**
 * src/utils/response.js
 * Uniform API response helpers.
 * Every endpoint must use these instead of calling res.json() directly.
 */

/**
 * 200 / 201 success response
 * @param {object} res   - Express response
 * @param {object} data  - Payload (object or array)
 * @param {string} message
 * @param {object} meta  - Pagination or extra context
 * @param {number} status - HTTP status code (default 200)
 */
const success = (res, data = null, message = 'Success', meta = null, status = 200) => {
  const body = { success: true, message };
  if (data !== null) body.data = data;
  if (meta !== null) body.meta = meta;
  return res.status(status).json(body);
};

const created = (res, data, message = 'Created successfully') =>
  success(res, data, message, null, 201);

/**
 * Error response — never expose stack traces or raw DB errors in production.
 */
const error = (res, message, code = 'ERROR', errors = [], status = 400) =>
  res.status(status).json({ success: false, message, code, errors });

const badRequest = (res, message, errors = []) =>
  error(res, message, 'BAD_REQUEST', errors, 400);

const unauthorized = (res, message = 'Authentication required') =>
  error(res, message, 'UNAUTHORIZED', [], 401);

const forbidden = (res, message = 'You are not authorised to perform this action') =>
  error(res, message, 'FORBIDDEN', [], 403);

const notFound = (res, message = 'Resource not found') =>
  error(res, message, 'NOT_FOUND', [], 404);

const conflict = (res, message) =>
  error(res, message, 'CONFLICT', [], 409);

const unprocessable = (res, message, errors = []) =>
  error(res, message, 'VALIDATION_ERROR', errors, 422);

const serverError = (res, message = 'An unexpected error occurred') =>
  error(res, message, 'INTERNAL_SERVER_ERROR', [], 500);

/**
 * Build pagination meta from Prisma-style results.
 */
const paginationMeta = ({ page, perPage, total }) => ({
  page,
  perPage,
  total,
  totalPages: Math.ceil(total / perPage),
});

module.exports = {
  success,
  created,
  error,
  badRequest,
  unauthorized,
  forbidden,
  notFound,
  conflict,
  unprocessable,
  serverError,
  paginationMeta,
};


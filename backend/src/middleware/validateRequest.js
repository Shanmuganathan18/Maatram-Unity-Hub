/**
 * src/middleware/validateRequest.js
 *
 * Runs express-validator validation chains and returns a 422 if any fail.
 * Usage:
 *   router.post('/zones', [...validationRules], validateRequest, handler)
 */
const { validationResult } = require('express-validator');
const { unprocessable } = require('../utils/response');

const validateRequest = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const formatted = errors.array().map((e) => ({
      field: e.path || e.param,
      message: e.msg,
      value: e.value,
    }));
    return unprocessable(res, 'Validation failed. Please check the highlighted fields.', formatted);
  }
  next();
};

module.exports = validateRequest;


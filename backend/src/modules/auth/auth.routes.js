/**
 * src/modules/auth/auth.routes.js
 * Authentication endpoints — no zone restriction, but rate-limited.
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authLimiter } = require('../../middleware/rateLimiter');
const { authenticate, authenticateOptional } = require('../../middleware/authenticate');
const { requireActiveAccount } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const authController = require('./auth.controller');

const router = Router();

// POST /api/v1/auth/login
router.post(
  '/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validateRequest,
  authController.login,
);

// POST /api/v1/auth/register  (Student self-registration)
router.post(
  '/register',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters'),
    body('name').trim().notEmpty().withMessage('Full name required'),
    body('institutionId').notEmpty().withMessage('Institution required'),
    body('department').trim().notEmpty().withMessage('Department required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  ],
  validateRequest,
  authController.register,
);

// POST /api/v1/auth/logout
router.post('/logout', authenticate, authController.logout);

// GET /api/v1/auth/me  — returns full profile + role + permissions
router.get('/me', authenticate, requireActiveAccount, authController.getMe);

// POST /api/v1/auth/refresh  — exchange refresh token for new access token
router.post('/refresh', authLimiter, authController.refresh);

// POST /api/v1/auth/forgot-password  — trigger Supabase password reset email
router.post(
  '/forgot-password',
  authLimiter,
  [body('email').isEmail().normalizeEmail().withMessage('Valid email required')],
  validateRequest,
  authController.forgotPassword,
);

// POST /api/v1/auth/reset-password — finalize password reset
router.post(
  '/reset-password',
  authLimiter,
  [
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  validateRequest,
  authController.resetPassword,
);

// POST /api/v1/auth/change-password — authenticated or email-verified password update
router.post(
  '/change-password',
  authenticateOptional,
  authLimiter,
  [
    body('email').optional().isEmail().normalizeEmail().withMessage('Valid email required'),
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('New password must be at least 8 characters long'),
  ],
  validateRequest,
  authController.changePassword,
);

// POST /api/v1/auth/google — verify Google OAuth session from any of the three portals
router.post(
  '/google',
  authLimiter,
  [
    body('portal')
      .isIn(['student', 'officer', 'admin'])
      .withMessage('Valid portal required (student, officer, admin)'),
  ],
  validateRequest,
  authController.googleAuth,
);

// POST /api/v1/auth/complete-student-profile — finalize student onboarding after Google OAuth
router.post(
  '/complete-student-profile',
  authLimiter,
  [
    body('institutionId').notEmpty().withMessage('Institution is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
    body('phone').optional().isMobilePhone().withMessage('Invalid phone number'),
  ],
  validateRequest,
  authController.completeStudentProfile,
);

module.exports = router;


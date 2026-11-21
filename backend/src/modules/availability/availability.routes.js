/**
 * src/modules/availability/availability.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requireZoneAccess } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const availabilityController = require('./availability.controller');

const router = Router();

// ── Student personal availability routes ─────────────────────────────────────
router.get(
  '/week',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  availabilityController.getWeek,
);

router.put(
  '/week/:weekStart/draft',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  [body('days').isObject().withMessage('Days object is required')],
  validateRequest,
  availabilityController.saveDraft,
);

router.post(
  '/week/:weekStart/submit',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  [body('days').isObject().withMessage('Days object is required')],
  validateRequest,
  availabilityController.submitWeek,
);

router.get(
  '/history',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  availabilityController.getHistory,
);

router.get(
  '/templates',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  availabilityController.listTemplates,
);

router.post(
  '/templates',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  [
    body('name').trim().notEmpty().withMessage('Template name is required'),
    body('pattern').isArray().withMessage('Pattern must be an array of 7 days'),
  ],
  validateRequest,
  availabilityController.createTemplate,
);

router.delete(
  '/templates/:id',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  availabilityController.deleteTemplate,
);

// ── Officer Zone Availability Monitoring ─────────────────────────────────────
router.get(
  '/zone',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  availabilityController.getZoneAvailability,
);

router.get(
  '/zone/best-dates',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  availabilityController.getBestDates,
);

router.get(
  '/zone/:weekStart',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  availabilityController.getZoneAvailability,
);

module.exports = router;

/**
 * src/modules/events/event.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requireZoneAccess } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const eventController = require('./event.controller');

const router = Router();

// General event list and detail
router.get('/', authenticate, requireActiveAccount, eventController.listEvents);
router.get('/:id', authenticate, requireActiveAccount, eventController.getEventById);

// Batch import events
router.post(
  '/batch',
  authenticate,
  requireActiveAccount,
  eventController.batchCreateEvents,
);

// Officer event creation and lifecycle management (zone verified)
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  [
    body('title').trim().isLength({ min: 3 }).withMessage('Title must be at least 3 characters'),
    body('category').notEmpty().withMessage('Category is required'),
    body('date').isDate().withMessage('Valid event date required (YYYY-MM-DD)'),
  ],
  validateRequest,
  eventController.createEvent,
);

router.post(
  '/:id/publish',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  eventController.publishEvent,
);

router.post(
  '/:id/postpone',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  [body('newDate').isDate().withMessage('New future date is required')],
  validateRequest,
  eventController.postponeEvent,
);

router.post(
  '/:id/cancel',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  eventController.cancelEvent,
);

module.exports = router;

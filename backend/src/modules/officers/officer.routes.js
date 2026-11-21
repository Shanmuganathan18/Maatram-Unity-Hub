/**
 * src/modules/officers/officer.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const {
  requireActiveAccount,
  requireRole,
  requirePermission,
  requireZoneAccess,
} = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const officerController = require('./officer.controller');

const router = Router();

// Officer Dashboard (Officer only, zone isolation enforced)
router.get(
  '/dashboard',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  officerController.getDashboard,
);

// Admin-managed officer endpoints
router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('officers.view'),
  officerController.listOfficers,
);

router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('officers.create'),
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
  ],
  validateRequest,
  officerController.createOfficer,
);

router.patch(
  '/:id/zone',
  authenticate,
  requireActiveAccount,
  requirePermission('officers.reassign'),
  [body('zoneId').notEmpty().withMessage('Zone ID is required')],
  validateRequest,
  officerController.reassignZone,
);

router.patch(
  '/:id/status',
  authenticate,
  requireActiveAccount,
  requireRole('ADMIN'),
  [body('status').isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('Valid status required')],
  validateRequest,
  officerController.toggleStatus,
);

router.post(
  '/:id/resend-invite',
  authenticate,
  requireActiveAccount,
  requireRole('ADMIN'),
  officerController.resendInvite,
);

module.exports = router;

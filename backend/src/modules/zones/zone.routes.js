/**
 * src/modules/zones/zone.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const zoneController = require('./zone.controller');

const router = Router();

// Public / authenticated read
router.get('/', authenticate, requireActiveAccount, zoneController.listZones);
router.get('/:id', authenticate, requireActiveAccount, zoneController.getZoneById);

// Admin-managed routes with permissions
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('zones.create'),
  [
    body('code').trim().notEmpty().withMessage('Zone code is required (e.g. ZN-A)'),
    body('name').trim().notEmpty().withMessage('Zone name is required'),
    body('region').trim().notEmpty().withMessage('Region is required'),
  ],
  validateRequest,
  zoneController.createZone,
);

router.post(
  '/batch',
  authenticate,
  requireActiveAccount,
  requirePermission('zones.create'),
  zoneController.batchCreateZones,
);

router.patch(
  '/:id',
  authenticate,
  requireActiveAccount,
  requirePermission('zones.edit'),
  zoneController.updateZone,
);

router.post(
  '/:id/deactivate',
  authenticate,
  requireActiveAccount,
  requirePermission('zones.deactivate'),
  zoneController.toggleZoneStatus,
);

module.exports = router;

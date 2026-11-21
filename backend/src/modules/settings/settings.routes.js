/**
 * src/modules/settings/settings.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const settingsController = require('./settings.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('settings.view'),
  settingsController.getSettings,
);

router.patch(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('settings.edit'),
  settingsController.updateSettings,
);

module.exports = router;

/**
 * src/modules/activity/activity.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requireZoneAccess } = require('../../middleware/authorize');
const activityController = require('./activity.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  activityController.listActivity,
);

module.exports = router;

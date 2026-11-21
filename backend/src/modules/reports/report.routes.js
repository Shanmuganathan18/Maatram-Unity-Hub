/**
 * src/modules/reports/report.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount } = require('../../middleware/authorize');
const reportController = require('./report.controller');

const router = Router();

router.get(
  '/availability',
  authenticate,
  requireActiveAccount,
  reportController.getAvailabilityReport,
);

router.get(
  '/availability/export',
  authenticate,
  requireActiveAccount,
  reportController.exportAvailabilityCSV,
);

module.exports = router;

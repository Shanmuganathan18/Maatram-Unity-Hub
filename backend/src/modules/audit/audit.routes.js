/**
 * src/modules/audit/audit.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const auditController = require('./audit.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('audit.view'),
  auditController.listAuditLogs,
);

module.exports = router;

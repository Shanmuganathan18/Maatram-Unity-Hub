/**
 * src/modules/permissions/permission.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const permissionController = require('./permission.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('roles.view'),
  permissionController.listPermissions,
);

router.get(
  '/history',
  authenticate,
  requireActiveAccount,
  requirePermission('roles.view'),
  permissionController.getHistory,
);

module.exports = router;

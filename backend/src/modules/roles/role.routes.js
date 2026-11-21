/**
 * src/modules/roles/role.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const roleController = require('./role.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('roles.view'),
  roleController.listRoles,
);

router.put(
  '/:id/permissions',
  authenticate,
  requireActiveAccount,
  requirePermission('roles.manage'),
  [body('permissions').isArray().withMessage('Permissions array required')],
  validateRequest,
  roleController.updateRolePermissions,
);

module.exports = router;

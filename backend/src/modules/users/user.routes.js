/**
 * src/modules/users/user.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const userController = require('./user.controller');

const router = Router();

router.get(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('users.view'),
  userController.listUsers,
);

router.post(
  '/:id/toggle-status',
  authenticate,
  requireActiveAccount,
  requirePermission('users.toggle'),
  [
    body('status')
      .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED'])
      .withMessage('Valid status required: ACTIVE, INACTIVE, SUSPENDED'),
  ],
  validateRequest,
  userController.toggleUserStatus,
);

module.exports = router;

/**
 * src/modules/departments/department.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, authenticateOptional } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const departmentController = require('./department.controller');

const router = Router();

router.get('/', authenticateOptional, departmentController.listDepartments);

router.post(
  '/batch',
  authenticate,
  requireActiveAccount,
  requirePermission('institutions.edit'),
  departmentController.batchCreateDepartments,
);

router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('institutions.edit'),
  [
    body('institutionId').notEmpty().withMessage('Institution ID is required'),
    body('name').trim().notEmpty().withMessage('Department name is required'),
  ],
  validateRequest,
  departmentController.createDepartment,
);

module.exports = router;

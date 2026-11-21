/**
 * src/modules/institutions/institution.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate, authenticateOptional } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const institutionController = require('./institution.controller');

const router = Router();

// List institutions (also accessible for registration with authenticateOptional)
router.get('/', authenticateOptional, institutionController.listInstitutions);
router.get('/:id', authenticate, requireActiveAccount, institutionController.getInstitutionById);

// Admin-only management
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('institutions.create'),
  [
    body('code').trim().notEmpty().withMessage('Institution code is required'),
    body('name').trim().notEmpty().withMessage('Institution name is required'),
    body('location').trim().notEmpty().withMessage('Location is required'),
  ],
  validateRequest,
  institutionController.createInstitution,
);

router.post(
  '/batch',
  authenticate,
  requireActiveAccount,
  requirePermission('institutions.create'),
  institutionController.batchCreateInstitutions,
);

router.patch(
  '/:id',
  authenticate,
  requireActiveAccount,
  requirePermission('institutions.edit'),
  institutionController.updateInstitution,
);

module.exports = router;

/**
 * src/modules/admins/admin.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const { memoryUpload } = require('../../services/storageService');
const adminController = require('./admin.controller');
const adminProvisioningController = require('../admin/adminProvisioning.controller');
const adminEmailController = require('../admin/adminEmail.controller');

const router = Router();

// All routes here require active ADMIN role
const adminProtect = [authenticate, requireActiveAccount, requireRole('ADMIN')];

router.get('/dashboard', ...adminProtect, adminController.getDashboard);

router.get('/', ...adminProtect, adminController.listAdmins);

router.get('/activity', ...adminProtect, adminController.getAdminActivity);

router.get('/email/status', ...adminProtect, adminController.getEmailStatus);

router.post(
  '/email/test',
  ...adminProtect,
  [body('to').optional().isEmail().withMessage('Valid email address required')],
  validateRequest,
  adminController.sendTestEmail,
);

router.post(
  '/',
  ...adminProtect,
  [
    body('email').isEmail().withMessage('A valid email address is required'),
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('phone').optional().isMobilePhone().withMessage('Valid phone number required'),
    body('password').optional().isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  ],
  validateRequest,
  adminController.createAdmin,
);

router.patch(
  '/:id/status',
  ...adminProtect,
  [
    body('status')
      .isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'Active', 'Inactive', 'Suspended'])
      .withMessage('Valid status required (ACTIVE, INACTIVE, SUSPENDED)'),
  ],
  validateRequest,
  adminController.toggleAdminStatus,
);

// ── Bulk Student Provisioning ────────────────────────────────────────────────
router.post(
  '/students/import/preview',
  ...adminProtect,
  memoryUpload.single('file'),
  adminProvisioningController.previewStudentImport,
);

router.post(
  '/students/import/confirm',
  ...adminProtect,
  adminProvisioningController.confirmStudentImport,
);

router.get(
  '/students/import/template',
  ...adminProtect,
  adminProvisioningController.getStudentTemplate,
);

// ── Bulk Officer Provisioning ────────────────────────────────────────────────
router.post(
  '/officers/import/preview',
  ...adminProtect,
  memoryUpload.single('file'),
  adminProvisioningController.previewOfficerImport,
);

router.post(
  '/officers/import/confirm',
  ...adminProtect,
  adminProvisioningController.confirmOfficerImport,
);

router.get(
  '/officers/import/template',
  ...adminProtect,
  adminProvisioningController.getOfficerTemplate,
);

// ── Import History ───────────────────────────────────────────────────────────
router.get(
  '/imports',
  ...adminProtect,
  adminProvisioningController.listImportJobs,
);

router.get(
  '/imports/:id',
  ...adminProtect,
  adminProvisioningController.getImportJobById,
);

// ── Email Delivery Management ─────────────────────────────────────────────────
router.get(
  '/emails',
  ...adminProtect,
  adminEmailController.listEmailLogs,
);

router.get(
  '/emails/:id',
  ...adminProtect,
  adminEmailController.getEmailLogById,
);

router.post(
  '/emails/:id/retry',
  ...adminProtect,
  adminEmailController.retryFailedEmail,
);

router.post(
  '/emails/retry-failed',
  ...adminProtect,
  adminEmailController.bulkRetryFailedEmails,
);

router.post(
  '/users/:userId/resend-activation',
  ...adminProtect,
  adminEmailController.resendActivationToUser,
);

module.exports = router;

/**
 * src/modules/students/student.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const studentController = require('./student.controller');

const router = Router();

// Current student personal endpoints
router.get('/me', authenticate, requireActiveAccount, requireRole('STUDENT'), studentController.getMyProfile);
router.patch('/me', authenticate, requireActiveAccount, requireRole('STUDENT'), studentController.updateMyProfile);

// List students (Officers view their own zone; Admins view all or filter)
router.get('/', authenticate, requireActiveAccount, studentController.listStudents);

// Student detail view (Zone isolation automatically enforced if Officer)
router.get('/:id', authenticate, requireActiveAccount, studentController.getStudentById);

// Admin-only student account provisioning
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requireRole('ADMIN'),
  [
    body('name').trim().notEmpty().withMessage('Full name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('institutionId').notEmpty().withMessage('Institution is required'),
    body('department').trim().notEmpty().withMessage('Department is required'),
    body('year').isInt({ min: 1, max: 6 }).withMessage('Year must be between 1 and 6'),
    body('registerNumber').optional().trim(),
    body('phone').optional().trim(),
    body('temporaryPassword').optional().isLength({ min: 8 }).withMessage('Temporary password must be at least 8 characters'),
  ],
  validateRequest,
  studentController.createStudent,
);

// Admin-only updates
router.patch(
  '/:id',
  authenticate,
  requireActiveAccount,
  requirePermission('students.edit'),
  studentController.updateStudentByAdmin,
);

router.post(
  '/:id/toggle-status',
  authenticate,
  requireActiveAccount,
  requirePermission('students.toggle'),
  [body('status').isIn(['ACTIVE', 'INACTIVE', 'SUSPENDED']).withMessage('Valid status required')],
  validateRequest,
  studentController.toggleStudentStatus,
);

module.exports = router;

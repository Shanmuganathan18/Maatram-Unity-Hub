/**
 * src/modules/attendance/attendance.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const attendanceController = require('./attendance.controller');

const router = Router();

// Get attendance sheet for an event
router.get(
  '/events/:eventId',
  authenticate,
  requireActiveAccount,
  attendanceController.getAttendanceSheet,
);

// Mark individual attendance
router.patch(
  '/invitations/:invitationId',
  authenticate,
  requireActiveAccount,
  [
    body('status')
      .isIn(['PRESENT', 'ABSENT', 'EXCUSED'])
      .withMessage('Valid status required: PRESENT, ABSENT, EXCUSED'),
  ],
  validateRequest,
  attendanceController.markAttendance,
);

// Bulk mark attendance
router.post(
  '/events/:eventId/bulk',
  authenticate,
  requireActiveAccount,
  [body('records').isArray().withMessage('Records array required')],
  validateRequest,
  attendanceController.bulkMarkAttendance,
);

module.exports = router;

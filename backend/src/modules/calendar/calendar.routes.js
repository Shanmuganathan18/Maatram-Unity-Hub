/**
 * src/modules/calendar/calendar.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requireZoneAccess } = require('../../middleware/authorize');
const calendarController = require('./calendar.controller');

const router = Router();

router.get(
  '/student',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  calendarController.getStudentCalendar,
);

router.get(
  '/zone',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  calendarController.getZoneCalendar,
);

module.exports = router;

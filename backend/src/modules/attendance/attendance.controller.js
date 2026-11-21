/**
 * src/modules/attendance/attendance.controller.js
 */
const attendanceService = require('./attendance.service');
const { success } = require('../../utils/response');

const getAttendanceSheet = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const result = await attendanceService.getEventAttendanceSheet(
      req.params.eventId,
      officerZoneId,
    );
    return success(res, result, 'Attendance sheet retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const markAttendance = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.officerProfile?.name || req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
      zoneId: req.user.officerProfile?.zoneId,
    };
    const att = await attendanceService.markAttendance(
      req.params.invitationId,
      req.body.status,
      req.body.note,
      actor,
    );
    return success(res, att, 'Attendance marked successfully');
  } catch (err) {
    next(err);
  }
};

const bulkMarkAttendance = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.officerProfile?.name || req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
      zoneId: req.user.officerProfile?.zoneId,
    };
    const result = await attendanceService.bulkMarkAttendance(
      req.params.eventId,
      req.body.records || [],
      actor,
    );
    return success(res, result, 'Bulk attendance recorded successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAttendanceSheet,
  markAttendance,
  bulkMarkAttendance,
};


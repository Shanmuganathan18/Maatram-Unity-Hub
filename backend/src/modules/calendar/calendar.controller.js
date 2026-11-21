/**
 * src/modules/calendar/calendar.controller.js
 */
const calendarService = require('./calendar.service');
const { success } = require('../../utils/response');

const getStudentCalendar = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const items = await calendarService.getStudentCalendar(studentProfileId);
    return success(res, items, 'Student calendar events retrieved');
  } catch (err) {
    next(err);
  }
};

const getZoneCalendar = async (req, res, next) => {
  try {
    const officerZoneId = req.user.officerProfile.zoneId;
    const items = await calendarService.getZoneCalendar(officerZoneId);
    return success(res, items, 'Zone calendar events retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentCalendar,
  getZoneCalendar,
};


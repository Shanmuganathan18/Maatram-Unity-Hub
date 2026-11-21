/**
 * src/modules/availability/availability.controller.js
 */
const availabilityService = require('./availability.service');
const { todayIST, weekStartOf } = require('../../utils/dates');
const { success, created } = require('../../utils/response');

const getWeek = async (req, res, next) => {
  try {
    const ws = req.query.ws || weekStartOf(todayIST());
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.getStudentWeekInfo(studentProfileId, ws);
    return success(res, result, 'Week availability retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const saveDraft = async (req, res, next) => {
  try {
    const ws = req.params.weekStart;
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.saveDraft(studentProfileId, ws, req.body.days);
    return success(res, result, 'Availability draft saved');
  } catch (err) {
    next(err);
  }
};

const submitWeek = async (req, res, next) => {
  try {
    const ws = req.params.weekStart;
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.submitWeek(
      studentProfileId,
      ws,
      req.body.days,
      req.user.id,
    );
    return success(res, result, 'Weekly availability submitted successfully');
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.getStudentHistory(studentProfileId);
    return success(res, result, 'Availability history retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const listTemplates = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.listTemplates(studentProfileId);
    return success(res, result, 'Templates retrieved');
  } catch (err) {
    next(err);
  }
};

const createTemplate = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const result = await availabilityService.createTemplate(
      studentProfileId,
      req.body.name,
      req.body.pattern,
    );
    return created(res, result, 'Template created');
  } catch (err) {
    next(err);
  }
};

const deleteTemplate = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    await availabilityService.deleteTemplate(studentProfileId, req.params.id);
    return success(res, null, 'Template deleted');
  } catch (err) {
    next(err);
  }
};

// ── Officer endpoints ────────────────────────────────────────────────────────
const getZoneAvailability = async (req, res, next) => {
  try {
    const officerZoneId = req.user.officerProfile?.zoneId;
    const ws = req.query.ws || req.params.weekStart || weekStartOf(todayIST());
    const result = await availabilityService.getZoneAvailability(officerZoneId, ws, req.query);
    return success(res, result, 'Zone availability retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getBestDates = async (req, res, next) => {
  try {
    const officerZoneId = req.user.officerProfile?.zoneId;
    const ws = req.query.ws || weekStartOf(todayIST());
    const result = await availabilityService.getBestDatesForZone(officerZoneId, ws);
    return success(res, result, 'Recommended dates calculated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getWeek,
  saveDraft,
  submitWeek,
  getHistory,
  listTemplates,
  createTemplate,
  deleteTemplate,
  getZoneAvailability,
  getBestDates,
};


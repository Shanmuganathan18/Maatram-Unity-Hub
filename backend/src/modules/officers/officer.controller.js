/**
 * src/modules/officers/officer.controller.js
 */
const officerService = require('./officer.service');
const { success, created } = require('../../utils/response');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await officerService.getOfficerDashboard(req.user.officerProfile);
    return success(res, dashboard, 'Officer dashboard retrieved');
  } catch (err) {
    next(err);
  }
};

const listOfficers = async (req, res, next) => {
  try {
    const officers = await officerService.listOfficers(req.query);
    return success(res, officers, 'Officers retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createOfficer = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const officer = await officerService.createOfficer(req.body, actor);
    return created(res, officer, 'Officer account created successfully');
  } catch (err) {
    next(err);
  }
};

const reassignZone = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await officerService.reassignOfficerZone(
      req.params.id,
      req.body.zoneId,
      actor,
    );
    return success(res, updated, 'Officer zone reassigned successfully');
  } catch (err) {
    next(err);
  }
};

const toggleStatus = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await officerService.toggleOfficerStatus(
      req.params.id,
      req.body.status || 'INACTIVE',
      actor,
    );
    return success(res, updated, `Officer status updated to ${updated.status}`);
  } catch (err) {
    next(err);
  }
};

const resendInvite = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const result = await officerService.resendOfficerInvite(req.params.id, actor);
    return success(res, result, 'Officer invitation resent successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  listOfficers,
  createOfficer,
  toggleStatus,
  resendInvite,
  reassignZone,
};


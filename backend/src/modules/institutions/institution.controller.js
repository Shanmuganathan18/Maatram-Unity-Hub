/**
 * src/modules/institutions/institution.controller.js
 */
const institutionService = require('./institution.service');
const { success, created } = require('../../utils/response');

const listInstitutions = async (req, res, next) => {
  try {
    // If officer, automatically enforce officer's zone
    const officerZoneId = req.user?.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const result = await institutionService.listInstitutions(req.query, officerZoneId);
    return success(res, result.items, 'Institutions retrieved successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getInstitutionById = async (req, res, next) => {
  try {
    const officerZoneId = req.user?.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const inst = await institutionService.getInstitutionById(req.params.id, officerZoneId);
    return success(res, inst, 'Institution retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createInstitution = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const inst = await institutionService.createInstitution(req.body, actor);
    return created(res, inst, 'Institution created successfully');
  } catch (err) {
    next(err);
  }
};

const updateInstitution = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const inst = await institutionService.updateInstitution(req.params.id, req.body, actor);
    return success(res, inst, 'Institution updated successfully');
  } catch (err) {
    next(err);
  }
};

const batchCreateInstitutions = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    const result = await institutionService.batchCreateInstitutions(items, actor);
    return success(res, result, `Batch imported ${result.created} new and ${result.updated} updated institutions`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  batchCreateInstitutions,
};


/**
 * src/modules/zones/zone.controller.js
 */
const zoneService = require('./zone.service');
const { success, created } = require('../../utils/response');

const listZones = async (req, res, next) => {
  try {
    const result = await zoneService.listZones(req.query);
    return success(res, result.items, 'Zones retrieved successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getZoneById = async (req, res, next) => {
  try {
    const zone = await zoneService.getZoneById(req.params.id);
    return success(res, zone, 'Zone retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createZone = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const zone = await zoneService.createZone(req.body, actor);
    return created(res, zone, 'Zone created successfully');
  } catch (err) {
    next(err);
  }
};

const updateZone = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const zone = await zoneService.updateZone(req.params.id, req.body, actor);
    return success(res, zone, 'Zone updated successfully');
  } catch (err) {
    next(err);
  }
};

const toggleZoneStatus = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const zone = await zoneService.toggleZoneStatus(
      req.params.id,
      req.body.status || 'INACTIVE',
      actor,
    );
    return success(res, zone, `Zone status updated to ${zone.status}`);
  } catch (err) {
    next(err);
  }
};

const batchCreateZones = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    const result = await zoneService.batchCreateZones(items, actor);
    return success(res, result, `Batch imported ${result.created} new and ${result.updated} updated zones`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listZones,
  getZoneById,
  createZone,
  updateZone,
  toggleZoneStatus,
  batchCreateZones,
};


/**
 * src/modules/permissions/permission.controller.js
 */
const permissionService = require('./permission.service');
const { success } = require('../../utils/response');

const listPermissions = async (req, res, next) => {
  try {
    const permissions = await permissionService.listPermissions();
    return success(res, permissions, 'Permissions catalog retrieved');
  } catch (err) {
    next(err);
  }
};

const getHistory = async (req, res, next) => {
  try {
    const history = await permissionService.getPermissionHistory();
    return success(res, history, 'Permission change history retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listPermissions,
  getHistory,
};


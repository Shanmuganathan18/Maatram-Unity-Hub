/**
 * src/modules/roles/role.controller.js
 */
const roleService = require('./role.service');
const { success } = require('../../utils/response');

const listRoles = async (req, res, next) => {
  try {
    const roles = await roleService.listRoles();
    return success(res, roles, 'Roles retrieved');
  } catch (err) {
    next(err);
  }
};

const updateRolePermissions = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name || req.user.email,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await roleService.updateRolePermissions(
      req.params.id,
      req.body.permissions || [],
      actor,
    );
    return success(res, updated, 'Role permissions updated');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listRoles,
  updateRolePermissions,
};


/**
 * src/modules/users/user.controller.js
 */
const userService = require('./user.service');
const { success } = require('../../utils/response');

const listUsers = async (req, res, next) => {
  try {
    const result = await userService.listUsers(req.query);
    return success(res, result.items, 'Users retrieved successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const toggleUserStatus = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await userService.toggleUserStatus(
      req.params.id,
      req.body.status || 'INACTIVE',
      actor,
    );
    return success(res, updated, `User status updated to ${updated.status}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listUsers,
  toggleUserStatus,
};


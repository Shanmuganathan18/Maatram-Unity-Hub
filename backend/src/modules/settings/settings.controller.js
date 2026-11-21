/**
 * src/modules/settings/settings.controller.js
 */
const settingsService = require('./settings.service');
const { success } = require('../../utils/response');

const getSettings = async (req, res, next) => {
  try {
    const settings = await settingsService.getSettings();
    return success(res, settings, 'System settings retrieved');
  } catch (err) {
    next(err);
  }
};

const updateSettings = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name || req.user.email,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await settingsService.updateSettings(req.body, actor);
    return success(res, updated, 'System settings updated successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSettings,
  updateSettings,
};


/**
 * src/modules/activity/activity.controller.js
 */
const activityService = require('./activity.service');
const { success } = require('../../utils/response');

const listActivity = async (req, res, next) => {
  try {
    const officerZoneId = req.user.officerProfile.zoneId;
    const result = await activityService.listActivityLogs(officerZoneId, req.query);
    return success(res, result.items, 'Zone activity logs retrieved', result.meta);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listActivity,
};


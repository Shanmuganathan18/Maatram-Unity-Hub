/**
 * src/modules/admin/adminEmail.controller.js
 *
 * Controller for Admin email delivery management, audit logs,
 * failure inspection, and manual/bulk retries.
 */
const emailDeliveryService = require('../../services/emailDelivery.service');
const { success } = require('../../utils/response');

const listEmailLogs = async (req, res, next) => {
  try {
    const result = await emailDeliveryService.listEmailLogs(req.query);
    return success(res, result.items, 'Email delivery logs retrieved successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getEmailLogById = async (req, res, next) => {
  try {
    const log = await emailDeliveryService.getEmailLogById(req.params.id);
    return success(res, log, 'Email delivery log details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const retryFailedEmail = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const result = await emailDeliveryService.retryFailedEmailLog(req.params.id, actor);
    return success(res, result, 'Failed email delivery re-attempted successfully');
  } catch (err) {
    next(err);
  }
};

const resendActivationToUser = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const result = await emailDeliveryService.resendActivationByUserId(
      req.params.userId,
      req.body.temporaryPassword || null,
      actor,
    );
    return success(res, result, 'Activation credentials resent successfully');
  } catch (err) {
    next(err);
  }
};

const bulkRetryFailedEmails = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const summary = await emailDeliveryService.bulkRetryFailedEmails(actor);
    return success(res, summary, 'Bulk retry process completed');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listEmailLogs,
  getEmailLogById,
  retryFailedEmail,
  resendActivationToUser,
  bulkRetryFailedEmails,
};


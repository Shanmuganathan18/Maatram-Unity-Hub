/**
 * src/modules/admins/admin.controller.js
 */
const adminService = require('./admin.service');
const emailService = require('../../services/emailService');
const { success } = require('../../utils/response');

const getDashboard = async (req, res, next) => {
  try {
    const dashboard = await adminService.getSystemDashboard();
    return success(res, dashboard, 'System dashboard retrieved');
  } catch (err) {
    next(err);
  }
};

const listAdmins = async (req, res, next) => {
  try {
    const data = await adminService.listAdmins(req.query);
    return success(res, data, 'Administrators retrieved');
  } catch (err) {
    next(err);
  }
};

const createAdmin = async (req, res, next) => {
  try {
    const admin = await adminService.createAdmin(req.body, req.user);
    return success(res, admin, 'Administrator account created successfully', 201);
  } catch (err) {
    next(err);
  }
};

const toggleAdminStatus = async (req, res, next) => {
  try {
    const result = await adminService.toggleAdminStatus(
      req.params.id,
      req.body.status,
      req.user,
    );
    return success(res, result, 'Administrator status updated successfully');
  } catch (err) {
    next(err);
  }
};

const getAdminActivity = async (req, res, next) => {
  try {
    const activity = await adminService.getAdminActivity(req.query);
    return success(res, activity, 'Admin activity logs retrieved');
  } catch (err) {
    next(err);
  }
};

const getEmailStatus = async (req, res, next) => {
  try {
    const status = emailService.getStatus();
    return success(res, status, 'Email service diagnostic status');
  } catch (err) {
    next(err);
  }
};

const sendTestEmail = async (req, res, next) => {
  try {
    const recipient = req.body.to || req.user.email;
    const result = await emailService.sendTestEmail(recipient, req.user.name || req.user.email);
    if (result.status === 'FAILED') {
      return res.status(500).json({
        success: false,
        message: `Failed to deliver test email: ${result.errorReason}`,
        data: result,
      });
    }
    return success(res, result, `Test email processed (Status: ${result.status})`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDashboard,
  listAdmins,
  createAdmin,
  toggleAdminStatus,
  getAdminActivity,
  getEmailStatus,
  sendTestEmail,
};

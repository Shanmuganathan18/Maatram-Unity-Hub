/**
 * src/modules/auth/auth.controller.js
 * Controller for authentication endpoints.
 */
const authService = require('./auth.service');
const { success, created } = require('../../utils/response');
const { AuthorizationError, ValidationError } = require('../../utils/errors');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const result = await authService.login(email, password, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, result, 'Signed in successfully');
  } catch (err) {
    next(err);
  }
};

const register = async (req, res, next) => {
  // Business Rule: Students must NOT be able to register independently using personal email.
  return next(
    new AuthorizationError(
      'Independent registration is disabled. Student accounts must be provisioned by an Administrator.',
    ),
  );
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.id, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    return success(res, null, 'Signed out successfully');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const profile = await authService.getFullProfile(req.user.id);
    return success(res, profile, 'Profile retrieved');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const { refreshToken } = req.body;
    const result = await authService.refreshToken(refreshToken);
    return success(res, result, 'Token refreshed');
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email, portal } = req.body;
    await authService.sendPasswordReset(email, portal || 'student');
    // Always return success to prevent email enumeration
    return success(
      res,
      null,
      'If an account exists with that email, a password reset link has been sent.',
    );
  } catch (err) {
    next(err);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const result = await authService.changePassword({
      userId: req.user.id,
      currentPassword,
      newPassword,
    });
    return success(res, result, 'Password updated successfully');
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.body.token;

    const { newPassword } = req.body;
    const result = await authService.resetPassword({ token, newPassword });
    return success(res, result, 'Password has been reset successfully');
  } catch (err) {
    next(err);
  }
};

const googleAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.body.token;

    const { portal } = req.body;
    const result = await authService.handleGoogleAuth(token, portal, {
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    return success(res, result, 'Google authentication processed successfully');
  } catch (err) {
    next(err);
  }
};

const completeStudentProfile = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : req.body.token;

    const { institutionId, department, year, phone } = req.body;
    const result = await authService.completeStudentProfile({
      token,
      institutionId,
      department,
      year,
      phone,
    });

    return success(res, result, 'Student profile completed successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  login,
  register,
  logout,
  getMe,
  refresh,
  forgotPassword,
  changePassword,
  resetPassword,
  googleAuth,
  completeStudentProfile,
};


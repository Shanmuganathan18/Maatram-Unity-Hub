/**
 * src/modules/students/student.controller.js
 */
const studentService = require('./student.service');
const { success } = require('../../utils/response');

const listStudents = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const result = await studentService.listStudents(req.query, officerZoneId);
    return success(res, result.items, 'Students retrieved successfully', result.meta);
  } catch (err) {
    next(err);
  }
};

const getStudentById = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const student = await studentService.getStudentById(req.params.id, officerZoneId);
    return success(res, student, 'Student details retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getMyProfile = async (req, res, next) => {
  try {
    const profile = await studentService.getMyProfile(req.user.id);
    return success(res, profile, 'Profile retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const updateMyProfile = async (req, res, next) => {
  try {
    const profile = await studentService.updateMyProfile(req.user.id, req.body);
    return success(res, profile, 'Profile updated successfully');
  } catch (err) {
    next(err);
  }
};

const updateStudentByAdmin = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const student = await studentService.updateStudentByAdmin(req.params.id, req.body, actor);
    return success(res, student, 'Student updated successfully');
  } catch (err) {
    next(err);
  }
};

const toggleStudentStatus = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const student = await studentService.toggleStudentStatus(
      req.params.id,
      req.body.status || 'INACTIVE',
      actor,
    );
    return success(res, student, `Student status updated to ${student.status}`);
  } catch (err) {
    next(err);
  }
};

const createStudent = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const student = await studentService.createStudentByAdmin(req.body, actor);
    return success(res, student, 'Student account provisioned successfully', undefined, 201);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listStudents,
  getStudentById,
  getMyProfile,
  updateMyProfile,
  createStudent,
  updateStudentByAdmin,
  toggleStudentStatus,
};


/**
 * src/modules/departments/department.controller.js
 */
const departmentService = require('./department.service');
const { success, created } = require('../../utils/response');

const listDepartments = async (req, res, next) => {
  try {
    const depts = await departmentService.listDepartments(req.query.institutionId);
    return success(res, depts, 'Departments retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const dept = await departmentService.createDepartment(req.body);
    return created(res, dept, 'Department created successfully');
  } catch (err) {
    next(err);
  }
};

const batchCreateDepartments = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    const result = await departmentService.batchCreateDepartments(items, actor);
    return success(res, result, `Batch imported ${result.created} new and ${result.updated} updated departments`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listDepartments,
  createDepartment,
  batchCreateDepartments,
};


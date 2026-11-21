/**
 * src/modules/admin/adminProvisioning.controller.js
 * Controller endpoints for Admin Bulk Provisioning & Templates.
 */
const adminProvisioningService = require('./adminProvisioning.service');
const prisma = require('../../config/database');
const { success, created } = require('../../utils/response');
const { ValidationError, NotFoundError } = require('../../utils/errors');

const previewStudentImport = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('A CSV or Excel file is required');
    }
    const result = await adminProvisioningService.previewStudentImport(
      req.file.buffer,
      req.file.originalname,
    );
    return success(res, result, 'Student file parsed and validated');
  } catch (err) {
    next(err);
  }
};

const confirmStudentImport = async (req, res, next) => {
  try {
    const { rows, validRecords, temporaryPassword, commonPassword, sendWelcomeEmail, notifyByEmail, fileName } = req.body;
    const finalRows = rows || validRecords;
    if (!finalRows || !Array.isArray(finalRows) || finalRows.length === 0) {
      throw new ValidationError('Validated rows array is required for import');
    }
    const result = await adminProvisioningService.confirmStudentImport({
      rows: finalRows,
      temporaryPassword: temporaryPassword || commonPassword || 'Maatram@2026',
      sendWelcomeEmail: sendWelcomeEmail !== undefined ? sendWelcomeEmail : (notifyByEmail !== undefined ? notifyByEmail : true),
      uploadedById: req.user.id,
      fileName,
    });
    return created(res, result, 'Students imported successfully');
  } catch (err) {
    next(err);
  }
};

const getStudentTemplate = async (req, res, next) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const template = adminProvisioningService.generateStudentTemplate(format);
    res.setHeader('Content-Type', template.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="students_import_template.${template.extension}"`,
    );
    return res.send(template.buffer);
  } catch (err) {
    next(err);
  }
};

const previewOfficerImport = async (req, res, next) => {
  try {
    if (!req.file) {
      throw new ValidationError('A CSV or Excel file is required');
    }
    const result = await adminProvisioningService.previewOfficerImport(
      req.file.buffer,
      req.file.originalname,
    );
    return success(res, result, 'Officer file parsed and validated');
  } catch (err) {
    next(err);
  }
};

const confirmOfficerImport = async (req, res, next) => {
  try {
    const { rows, validRecords, temporaryPassword, commonPassword, sendWelcomeEmail, notifyByEmail, fileName } = req.body;
    const finalRows = rows || validRecords;
    if (!finalRows || !Array.isArray(finalRows) || finalRows.length === 0) {
      throw new ValidationError('Validated rows array is required for officer import');
    }
    const result = await adminProvisioningService.confirmOfficerImport({
      rows: finalRows,
      temporaryPassword: temporaryPassword || commonPassword || 'Maatram@2026',
      sendWelcomeEmail: sendWelcomeEmail !== undefined ? sendWelcomeEmail : (notifyByEmail !== undefined ? notifyByEmail : true),
      uploadedById: req.user.id,
      fileName,
    });
    return created(res, result, 'Officers imported successfully');
  } catch (err) {
    next(err);
  }
};

const getOfficerTemplate = async (req, res, next) => {
  try {
    const format = (req.query.format || 'csv').toLowerCase();
    const template = adminProvisioningService.generateOfficerTemplate(format);
    res.setHeader('Content-Type', template.mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="officers_import_template.${template.extension}"`,
    );
    return res.send(template.buffer);
  } catch (err) {
    next(err);
  }
};

const listImportJobs = async (req, res, next) => {
  try {
    const jobs = await prisma.dataImportJob.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return success(res, jobs, 'Import jobs retrieved');
  } catch (err) {
    next(err);
  }
};

const getImportJobById = async (req, res, next) => {
  try {
    const job = await prisma.dataImportJob.findUnique({
      where: { id: req.params.id },
    });
    if (!job) throw new NotFoundError('Import job not found');
    return success(res, job, 'Import job retrieved');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  previewStudentImport,
  confirmStudentImport,
  getStudentTemplate,
  previewOfficerImport,
  confirmOfficerImport,
  getOfficerTemplate,
  listImportJobs,
  getImportJobById,
};


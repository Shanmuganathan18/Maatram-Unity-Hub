/**
 * src/modules/reports/report.controller.js
 */
const reportService = require('./report.service');
const prisma = require('../../config/database');
const { success } = require('../../utils/response');

const getAvailabilityReport = async (req, res, next) => {
  try {
    const isOfficer = req.user.role === 'OFFICER';
    if (isOfficer) {
      const data = await reportService.getZoneAvailabilityReport(
        req.user.officerProfile.zoneId,
        req.query.weekStart,
      );
      return success(res, data, 'Zone availability report generated');
    } else {
      const data = await reportService.getSystemAvailabilityReport(req.query.weekStart);
      return success(res, data, 'System availability report generated');
    }
  } catch (err) {
    next(err);
  }
};

const exportAvailabilityCSV = async (req, res, next) => {
  try {
    const isOfficer = req.user.role === 'OFFICER';
    let data;
    let headers;

    if (isOfficer) {
      data = await reportService.getZoneAvailabilityReport(
        req.user.officerProfile.zoneId,
        req.query.weekStart,
      );
      headers = [
        { key: 'studentCode', label: 'Student ID' },
        { key: 'name', label: 'Name' },
        { key: 'institution', label: 'Institution' },
        { key: 'department', label: 'Department' },
        { key: 'year', label: 'Year' },
        { key: 'status', label: 'Submission Status' },
        { key: 'availableDays', label: 'Available Days' },
        { key: 'unavailableDays', label: 'Unavailable Days' },
      ];
    } else {
      data = await reportService.getSystemAvailabilityReport(req.query.weekStart);
      headers = [
        { key: 'zoneCode', label: 'Zone Code' },
        { key: 'zoneName', label: 'Zone Name' },
        { key: 'institutionsCount', label: 'Institutions' },
        { key: 'totalStudents', label: 'Total Students' },
        { key: 'submittedCount', label: 'Submitted Count' },
        { key: 'submissionRate', label: 'Submission Rate (%)' },
      ];
    }

    const csv = reportService.generateCSV(headers, data);

    // Audit export
    if (['ADMIN', 'SUPER_ADMIN'].includes(req.user.role)) {
      await prisma.auditLog.create({
        data: {
          actorId: req.user.id,
          actorName: req.user.adminProfile?.name || req.user.email,
          actorRole: req.user.role.toLowerCase(),
          action: 'report.exported',
          category: 'Report',
          description: 'Exported availability report (CSV)',
        },
      });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="availability_report.csv"');
    return res.status(200).send(csv);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getAvailabilityReport,
  exportAvailabilityCSV,
};


/**
 * src/modules/audit/audit.controller.js
 */
const auditService = require('./audit.service');
const { success } = require('../../utils/response');

const listAuditLogs = async (req, res, next) => {
  try {
    const result = await auditService.listAuditLogs(req.query);
    return success(res, result.items, 'Audit logs retrieved', result.meta);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAuditLogs,
};


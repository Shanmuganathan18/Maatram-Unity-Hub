/**
 * src/modules/audit/audit.service.js
 * Immutable system audit logs.
 */
const prisma = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../utils/dates');

const listAuditLogs = async (query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = {};

  if (query.category) where.category = query.category;
  if (query.action) where.action = query.action;
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.actorRole) where.actorRole = query.actorRole.toLowerCase();

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { description: { contains: q } },
      { actorName: { contains: q } },
      { action: { contains: q } },
    ];
  }

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      include: {
        zone: { select: { code: true, name: true } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = logs.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorName: l.actorName,
    actorRole: l.actorRole,
    action: l.action,
    category: l.category,
    description: l.description,
    zoneId: l.zoneId,
    zoneName: l.zone?.name || null,
    related: l.related,
    at: l.createdAt.getTime(),
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

module.exports = {
  listAuditLogs,
};


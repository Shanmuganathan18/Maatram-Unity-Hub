/**
 * src/modules/activity/activity.service.js
 * Zone officer activity logs.
 */
const prisma = require('../../config/database');
const { parsePagination, paginationMeta } = require('../../utils/dates');

const listActivityLogs = async (officerZoneId, query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = { zoneId: officerZoneId };

  if (query.type) where.type = query.type;

  const [total, logs] = await Promise.all([
    prisma.activityLog.count({ where }),
    prisma.activityLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = logs.map((l) => ({
    id: l.id,
    zoneId: l.zoneId,
    actorId: l.actorId,
    actorName: l.actorName,
    type: l.type,
    description: l.description,
    at: l.createdAt.getTime(),
    related: l.related,
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

module.exports = {
  listActivityLogs,
};


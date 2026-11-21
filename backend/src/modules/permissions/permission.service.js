/**
 * src/modules/permissions/permission.service.js
 */
const prisma = require('../../config/database');

const listPermissions = async () => {
  const perms = await prisma.permission.findMany({
    orderBy: [{ group: 'asc' }, { label: 'asc' }],
  });

  // Group by category
  const groups = {};
  perms.forEach((p) => {
    if (!groups[p.group]) {
      groups[p.group] = [];
    }
    groups[p.group].push({
      key: p.key,
      label: p.label,
    });
  });

  return Object.entries(groups).map(([group, list]) => ({
    group,
    permissions: list,
  }));
};

const getPermissionHistory = async () => {
  return prisma.permissionHistory.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
};

module.exports = {
  listPermissions,
  getPermissionHistory,
};


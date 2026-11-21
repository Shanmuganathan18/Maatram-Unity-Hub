/**
 * src/modules/roles/role.service.js
 */
const prisma = require('../../config/database');
const { NotFoundError, ValidationError, AuthorizationError } = require('../../utils/errors');

const listRoles = async () => {
  const roles = await prisma.appRole.findMany({
    include: {
      permissions: { select: { permissionKey: true } },
      _count: { select: { adminProfiles: true } },
    },
    orderBy: { createdAt: 'asc' },
  });

  return roles.map((r) => ({
    id: r.id,
    label: r.label,
    description: r.description,
    editable: r.editable,
    assignedUsersCount: r._count.adminProfiles,
    permissions: r.permissions.map((p) => p.permissionKey),
  }));
};

const updateRolePermissions = async (roleId, permissionKeys, actor) => {
  const role = await prisma.appRole.findUnique({ where: { id: roleId } });
  if (!role) throw new NotFoundError('Role not found');

  if (actor.role !== 'ADMIN') {
    throw new AuthorizationError('Insufficient administrative privilege to modify permissions');
  }

  const finalKeys = [...new Set(permissionKeys)];

  await prisma.$transaction(async (tx) => {
    // Clear old permissions for this role
    await tx.rolePermission.deleteMany({
      where: { roleId },
    });

    // Insert new permissions
    for (const key of finalKeys) {
      await tx.rolePermission.create({
        data: {
          roleId,
          permissionKey: key,
        },
      });
    }

    // Record audit trail
    await tx.permissionHistory.create({
      data: {
        roleId,
        permissionKey: 'bulk_update',
        action: 'updated',
        actorId: actor.id,
        actorName: actor.name || actor.email,
        note: `Updated permissions for role ${role.label}`,
      },
    });
  });

  return listRoles();
};

module.exports = {
  listRoles,
  updateRolePermissions,
};

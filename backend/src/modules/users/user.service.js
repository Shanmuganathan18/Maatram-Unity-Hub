/**
 * src/modules/users/user.service.js
 */
const prisma = require('../../config/database');
const { NotFoundError, BadRequestError } = require('../../utils/errors');
const { parsePagination, paginationMeta } = require('../../utils/dates');

const listUsers = async (query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = {};

  if (query.role) where.role = query.role.toUpperCase();
  if (query.status) where.status = query.status.toUpperCase();
  if (query.q) {
    where.email = { contains: query.q.trim() };
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        studentProfile: { select: { name: true, studentId: true, zoneId: true } },
        officerProfile: { select: { name: true, officerId: true, designation: true, zoneId: true } },
        adminProfile: { select: { name: true, adminId: true, role: { select: { label: true } } } },
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = users.map((u) => {
    let displayName = u.email;
    let identifier = '—';
    let zoneId = null;

    if (u.studentProfile) {
      displayName = u.studentProfile.name;
      identifier = u.studentProfile.studentId;
      zoneId = u.studentProfile.zoneId;
    } else if (u.officerProfile) {
      displayName = u.officerProfile.name;
      identifier = u.officerProfile.officerId;
      zoneId = u.officerProfile.zoneId;
    } else if (u.adminProfile) {
      displayName = u.adminProfile.name;
      identifier = u.adminProfile.adminId;
    }

    return {
      id: u.id,
      email: u.email,
      name: displayName,
      identifier,
      role: u.role.toLowerCase(),
      status: u.status === 'ACTIVE' ? 'Active' : u.status === 'INACTIVE' ? 'Inactive' : u.status === 'SUSPENDED' ? 'Suspended' : 'Pending Activation',
      zoneId,
      lastLoginAt: u.lastLoginAt,
      createdAt: u.createdAt,
    };
  });

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

const toggleUserStatus = async (id, status, actor) => {
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new NotFoundError('User not found');

  const newStatus = status.toUpperCase();

  const updated = await prisma.$transaction(async (tx) => {
    const u = await tx.user.update({
      where: { id },
      data: { status: newStatus },
    });

    if (u.role === 'STUDENT') {
      await tx.studentProfile.updateMany({
        where: { userId: id },
        data: { status: newStatus },
      });
    } else if (u.role === 'OFFICER') {
      await tx.officerProfile.updateMany({
        where: { userId: id },
        data: { status: newStatus },
      });
    } else if (u.role === 'ADMIN') {
      if (actor.id === id && newStatus !== 'ACTIVE') {
        throw new BadRequestError('You cannot deactivate your own Administrator account');
      }
      if (newStatus !== 'ACTIVE') {
        const activeAdmins = await tx.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
        if (activeAdmins <= 1) {
          throw new BadRequestError('Cannot deactivate the last active Administrator account');
        }
      }
      await tx.adminProfile.updateMany({
        where: { userId: id },
        data: { status: newStatus },
      });
    }

    return u;
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'user.status_toggled',
      category: 'User',
      description: `Changed status of user ${user.email} to ${newStatus}`,
      related: { type: 'user', id: user.id, label: user.email },
    },
  });

  return updated;
};

module.exports = {
  listUsers,
  toggleUserStatus,
};


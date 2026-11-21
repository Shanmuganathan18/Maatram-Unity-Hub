/**
 * src/modules/zones/zone.service.js
 * Business logic for Zones.
 */
const prisma = require('../../config/database');
const { NotFoundError, ConflictError, AppError } = require('../../utils/errors');
const { parsePagination, paginationMeta } = require('../../utils/dates');

/**
 * List all zones with summary counts.
 */
const listZones = async (query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = {};

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
      { region: { contains: q } },
    ];
  }

  const [total, zones] = await Promise.all([
    prisma.zone.count({ where }),
    prisma.zone.findMany({
      where,
      skip,
      take,
      include: {
        _count: {
          select: {
            institutions: true,
            officerProfiles: true,
            studentProfiles: true,
          },
        },
      },
      orderBy: { code: 'asc' },
    }),
  ]);

  const formatted = zones.map((z) => ({
    id: z.id,
    code: z.code,
    name: z.name,
    region: z.region,
    description: z.description,
    status: z.status === 'ACTIVE' ? 'Active' : 'Inactive',
    institutionsCount: z._count.institutions,
    officersCount: z._count.officerProfiles,
    studentsCount: z._count.studentProfiles,
    createdAt: z.createdAt,
  }));

  return {
    items: formatted,
    meta: paginationMeta({ page, perPage, total }),
  };
};

/**
 * Get zone by ID with full details.
 */
const getZoneById = async (id) => {
  const zone = await prisma.zone.findUnique({
    where: { id },
    include: {
      institutions: {
        select: {
          id: true,
          code: true,
          name: true,
          location: true,
          status: true,
          _count: { select: { studentProfiles: true } },
        },
      },
      officerProfiles: {
        select: {
          id: true,
          officerId: true,
          name: true,
          designation: true,
          phone: true,
          status: true,
          user: { select: { email: true } },
        },
      },
      _count: {
        select: {
          studentProfiles: true,
          events: true,
        },
      },
    },
  });

  if (!zone) {
    throw new NotFoundError(`Zone with ID ${id} not found`);
  }

  return {
    id: zone.id,
    code: zone.code,
    name: zone.name,
    region: zone.region,
    description: zone.description,
    status: zone.status === 'ACTIVE' ? 'Active' : 'Inactive',
    createdAt: zone.createdAt,
    stats: {
      institutionsCount: zone.institutions.length,
      officersCount: zone.officerProfiles.length,
      studentsCount: zone._count.studentProfiles,
      eventsCount: zone._count.events,
    },
    institutions: zone.institutions.map((i) => ({
      id: i.id,
      code: i.code,
      name: i.name,
      location: i.location,
      status: i.status === 'ACTIVE' ? 'Active' : i.status === 'ONBOARDING' ? 'Onboarding' : 'Inactive',
      studentsCount: i._count.studentProfiles,
    })),
    officers: zone.officerProfiles.map((o) => ({
      id: o.id,
      officerId: o.officerId,
      name: o.name,
      designation: o.designation,
      email: o.user.email,
      phone: o.phone,
      status: o.status,
    })),
  };
};

/**
 * Create a new zone.
 */
const createZone = async (data, actor) => {
  const existing = await prisma.zone.findUnique({ where: { code: data.code.trim().toUpperCase() } });
  if (existing) {
    throw new ConflictError(`Zone with code "${data.code}" already exists`);
  }

  const zone = await prisma.zone.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      region: data.region.trim(),
      description: data.description ? data.description.trim() : null,
      status: data.status ? data.status.toUpperCase() : 'ACTIVE',
    },
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'zone.created',
      category: 'Zone',
      description: `Created zone ${zone.code} (${zone.name})`,
      zoneId: zone.id,
      related: { type: 'zone', id: zone.id, label: zone.name },
    },
  });

  return zone;
};

/**
 * Update an existing zone.
 */
const updateZone = async (id, data, actor) => {
  const zone = await prisma.zone.findUnique({ where: { id } });
  if (!zone) throw new NotFoundError('Zone not found');

  if (data.code && data.code.toUpperCase() !== zone.code) {
    const existing = await prisma.zone.findUnique({ where: { code: data.code.trim().toUpperCase() } });
    if (existing) throw new ConflictError(`Zone with code "${data.code}" already exists`);
  }

  const updated = await prisma.zone.update({
    where: { id },
    data: {
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      name: data.name ? data.name.trim() : undefined,
      region: data.region ? data.region.trim() : undefined,
      description: data.description !== undefined ? data.description?.trim() : undefined,
      status: data.status ? data.status.toUpperCase() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'zone.updated',
      category: 'Zone',
      description: `Updated zone ${updated.code} (${updated.name})`,
      zoneId: updated.id,
      related: { type: 'zone', id: updated.id, label: updated.name },
    },
  });

  return updated;
};

/**
 * Deactivate or toggle status of a zone.
 */
const toggleZoneStatus = async (id, status, actor) => {
  const zone = await prisma.zone.findUnique({ where: { id } });
  if (!zone) throw new NotFoundError('Zone not found');

  const updated = await prisma.zone.update({
    where: { id },
    data: { status: status.toUpperCase() },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: status.toUpperCase() === 'INACTIVE' ? 'zone.deactivated' : 'zone.activated',
      category: 'Zone',
      description: `Marked zone ${updated.code} as ${updated.status}`,
      zoneId: updated.id,
      related: { type: 'zone', id: updated.id, label: updated.name },
    },
  });

  return updated;
};

/**
 * Bulk / Batch import zones from CSV or Excel data.
 */
const batchCreateZones = async (items = [], actor = {}) => {
  const results = { created: 0, updated: 0, errors: [] };
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    try {
      const code = (row.code || '').trim().toUpperCase();
      const name = (row.name || '').trim();
      if (!code || !name) {
        results.errors.push({ row: i + 1, error: 'Code and Name are required' });
        continue;
      }

      const existing = await prisma.zone.findUnique({ where: { code } });
      if (existing) {
        await prisma.zone.update({
          where: { code },
          data: {
            name,
            region: row.region?.trim() || existing.region,
            description: row.description?.trim() || existing.description,
            status: row.status ? row.status.toUpperCase() : existing.status,
          },
        });
        results.updated++;
      } else {
        await prisma.zone.create({
          data: {
            code,
            name,
            region: row.region?.trim() || 'Tamil Nadu',
            description: row.description?.trim() || null,
            status: row.status ? row.status.toUpperCase() : 'ACTIVE',
          },
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push({ row: i + 1, code: row.code, error: err.message });
    }
  }

  if (actor.id) {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name || actor.email || 'Admin',
        actorRole: (actor.role || 'admin').toLowerCase(),
        action: 'zone.batch_import',
        category: 'Zone',
        description: `Bulk imported zones: ${results.created} created, ${results.updated} updated (${results.errors.length} errors)`,
      },
    }).catch(() => {});
  }

  return results;
};

module.exports = {
  listZones,
  getZoneById,
  createZone,
  updateZone,
  toggleZoneStatus,
  batchCreateZones,
};


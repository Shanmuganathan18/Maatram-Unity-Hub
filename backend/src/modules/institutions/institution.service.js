/**
 * src/modules/institutions/institution.service.js
 * Business logic for Institutions.
 */
const prisma = require('../../config/database');
const { NotFoundError, ConflictError, ZoneAccessError } = require('../../utils/errors');
const { parsePagination, paginationMeta } = require('../../utils/dates');

/**
 * List institutions.
 * If user is OFFICER, zoneId is forced to officer's assigned zone.
 */
const listInstitutions = async (query = {}, officerZoneId = null) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = {};

  if (officerZoneId) {
    where.zoneId = officerZoneId;
  } else if (query.zoneId) {
    where.zoneId = query.zoneId;
  }

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { code: { contains: q } },
      { location: { contains: q } },
    ];
  }

  const [total, institutions] = await Promise.all([
    prisma.institution.count({ where }),
    prisma.institution.findMany({
      where,
      skip,
      take,
      include: {
        zone: { select: { id: true, code: true, name: true } },
        departments: { select: { id: true, name: true, level: true } },
        _count: {
          select: {
            studentProfiles: true,
          },
        },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const items = institutions.map((i) => ({
    id: i.id,
    code: i.code,
    name: i.name,
    location: i.location,
    type: i.type,
    zoneId: i.zoneId,
    zone: i.zone,
    status: i.status === 'ACTIVE' ? 'Active' : i.status === 'ONBOARDING' ? 'Onboarding' : 'Inactive',
    departments: i.departments.map((d) => d.name),
    studentCount: i._count.studentProfiles,
    contactName: i.contactName,
    contactEmail: i.contactEmail,
    contactPhone: i.contactPhone,
    createdAt: i.createdAt,
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

/**
 * Get institution details by ID.
 * Enforces officer zone isolation if accessed by an officer.
 */
const getInstitutionById = async (id, officerZoneId = null) => {
  const institution = await prisma.institution.findUnique({
    where: { id },
    include: {
      zone: { select: { id: true, code: true, name: true } },
      departments: { select: { id: true, name: true, level: true } },
      studentProfiles: {
        select: {
          id: true,
          studentId: true,
          name: true,
          year: true,
          department: { select: { name: true } },
          status: true,
        },
      },
    },
  });

  if (!institution) {
    throw new NotFoundError(`Institution with ID ${id} not found`);
  }

  // Zone isolation check for officers
  if (officerZoneId && institution.zoneId !== officerZoneId) {
    throw new ZoneAccessError('You do not have permission to view institutions outside your assigned zone');
  }

  return {
    id: institution.id,
    code: institution.code,
    name: institution.name,
    location: institution.location,
    type: institution.type,
    zoneId: institution.zoneId,
    zone: institution.zone,
    status: institution.status === 'ACTIVE' ? 'Active' : institution.status === 'ONBOARDING' ? 'Onboarding' : 'Inactive',
    contactName: institution.contactName,
    contactEmail: institution.contactEmail,
    contactPhone: institution.contactPhone,
    departments: institution.departments.map((d) => d.name),
    studentsCount: institution.studentProfiles.length,
    students: institution.studentProfiles.map((s) => ({
      id: s.id,
      studentId: s.studentId,
      name: s.name,
      year: s.year,
      department: s.department?.name,
      status: s.status,
    })),
    createdAt: institution.createdAt,
  };
};

/**
 * Create a new institution (Admin only).
 */
const createInstitution = async (data, actor) => {
  // Check for duplicate code within the zone
  if (data.zoneId) {
    const existing = await prisma.institution.findUnique({
      where: {
        code_zoneId: {
          code: data.code.trim().toUpperCase(),
          zoneId: data.zoneId,
        },
      },
    });
    if (existing) {
      throw new ConflictError(`Institution code "${data.code}" already exists in this zone`);
    }
  }

  const institution = await prisma.institution.create({
    data: {
      code: data.code.trim().toUpperCase(),
      name: data.name.trim(),
      location: data.location.trim(),
      type: data.type || 'Engineering',
      zoneId: data.zoneId || null,
      contactName: data.contactName ? data.contactName.trim() : null,
      contactEmail: data.contactEmail ? data.contactEmail.trim() : null,
      contactPhone: data.contactPhone ? data.contactPhone.trim() : null,
      status: data.status ? data.status.toUpperCase() : 'ACTIVE',
      departments: data.departments && Array.isArray(data.departments)
        ? {
            create: data.departments.map((d) => ({
              name: typeof d === 'string' ? d.trim() : d.name,
              level: d.level || 'UG',
            })),
          }
        : undefined,
    },
    include: {
      departments: true,
      zone: true,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'institution.created',
      category: 'Institution',
      description: `Created institution ${institution.name} (${institution.code})`,
      zoneId: institution.zoneId,
      related: { type: 'institution', id: institution.id, label: institution.name },
    },
  });

  return institution;
};

/**
 * Update an institution.
 */
const updateInstitution = async (id, data, actor) => {
  const institution = await prisma.institution.findUnique({ where: { id } });
  if (!institution) throw new NotFoundError('Institution not found');

  const updated = await prisma.institution.update({
    where: { id },
    data: {
      code: data.code ? data.code.trim().toUpperCase() : undefined,
      name: data.name ? data.name.trim() : undefined,
      location: data.location ? data.location.trim() : undefined,
      type: data.type ? data.type : undefined,
      zoneId: data.zoneId !== undefined ? data.zoneId : undefined,
      contactName: data.contactName !== undefined ? data.contactName : undefined,
      contactEmail: data.contactEmail !== undefined ? data.contactEmail : undefined,
      contactPhone: data.contactPhone !== undefined ? data.contactPhone : undefined,
      status: data.status ? data.status.toUpperCase() : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'institution.updated',
      category: 'Institution',
      description: `Updated details for ${updated.name}`,
      zoneId: updated.zoneId,
      related: { type: 'institution', id: updated.id, label: updated.name },
    },
  });

  return updated;
};

/**
 * Bulk / Batch import institutions from CSV or Excel data.
 */
const batchCreateInstitutions = async (items = [], actor = {}) => {
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

      // Resolve zoneId if zoneCode, zoneName or zone is provided
      let zoneId = row.zoneId;
      if (!zoneId && (row.zoneCode || row.zone)) {
        const zQuery = (row.zoneCode || row.zone).trim();
        const z = await prisma.zone.findFirst({
          where: {
            OR: [{ id: zQuery }, { code: zQuery }, { name: zQuery }],
          },
        });
        if (z) zoneId = z.id;
      }
      if (!zoneId) zoneId = 'zone-a';

      const existing = await prisma.institution.findUnique({ where: { code } });
      if (existing) {
        await prisma.institution.update({
          where: { code },
          data: {
            name,
            location: row.location?.trim() || existing.location,
            type: row.type || existing.type,
            zoneId: zoneId || existing.zoneId,
            contactEmail: row.contactEmail || existing.contactEmail,
            contactPhone: row.contactPhone || existing.contactPhone,
            status: row.status ? row.status.toUpperCase() : existing.status,
          },
        });
        results.updated++;
      } else {
        await prisma.institution.create({
          data: {
            code,
            name,
            location: row.location?.trim() || 'Tamil Nadu',
            type: row.type || 'Engineering',
            zoneId,
            contactEmail: row.contactEmail || null,
            contactPhone: row.contactPhone || null,
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
        action: 'institution.batch_import',
        category: 'Institutions',
        description: `Bulk imported institutions: ${results.created} created, ${results.updated} updated (${results.errors.length} errors)`,
      },
    }).catch(() => {});
  }

  return results;
};

module.exports = {
  listInstitutions,
  getInstitutionById,
  createInstitution,
  updateInstitution,
  batchCreateInstitutions,
};


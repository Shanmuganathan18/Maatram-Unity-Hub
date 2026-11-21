/**
 * src/modules/departments/department.service.js
 */
const prisma = require('../../config/database');
const { NotFoundError, ConflictError } = require('../../utils/errors');

const listDepartments = async (institutionId) => {
  const where = {};
  if (institutionId) {
    where.institutionId = institutionId;
  }

  return prisma.department.findMany({
    where,
    include: {
      institution: { select: { id: true, name: true, code: true } },
      _count: { select: { studentProfiles: true } },
    },
    orderBy: { name: 'asc' },
  });
};

const createDepartment = async (data) => {
  const existing = await prisma.department.findUnique({
    where: {
      institutionId_name: {
        institutionId: data.institutionId,
        name: data.name.trim(),
      },
    },
  });

  if (existing) {
    throw new ConflictError(`Department "${data.name}" already exists for this institution`);
  }

  return prisma.department.create({
    data: {
      institutionId: data.institutionId,
      name: data.name.trim(),
      level: data.level || 'UG',
    },
  });
};

const batchCreateDepartments = async (items = [], actor = {}) => {
  const results = { created: 0, updated: 0, errors: [] };
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    try {
      const name = (row.name || '').trim();
      if (!name) {
        results.errors.push({ row: i + 1, error: 'Department name is required' });
        continue;
      }

      // Resolve institutionId
      let institutionId = row.institutionId;
      if (!institutionId && (row.institutionCode || row.institution || row.institutionName)) {
        const query = (row.institutionCode || row.institution || row.institutionName).trim();
        const inst = await prisma.institution.findFirst({
          where: {
            OR: [
              { id: query },
              { code: query },
              { name: query },
              { name: { contains: query } },
            ],
          },
        });
        if (inst) institutionId = inst.id;
      }

      if (!institutionId) {
        results.errors.push({
          row: i + 1,
          name,
          error: `Institution "${row.institutionCode || row.institution || 'unknown'}" could not be resolved`,
        });
        continue;
      }

      const existing = await prisma.department.findUnique({
        where: {
          institutionId_name: {
            institutionId,
            name,
          },
        },
      });

      if (existing) {
        await prisma.department.update({
          where: { id: existing.id },
          data: {
            level: row.level || existing.level || 'UG',
          },
        });
        results.updated++;
      } else {
        await prisma.department.create({
          data: {
            institutionId,
            name,
            level: row.level || 'UG',
          },
        });
        results.created++;
      }
    } catch (err) {
      results.errors.push({ row: i + 1, name: row.name, error: err.message });
    }
  }

  if (actor.id) {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name || actor.email || 'Admin',
        actorRole: (actor.role || 'admin').toLowerCase(),
        action: 'department.batch_import',
        category: 'Department',
        description: `Bulk imported departments: ${results.created} created, ${results.updated} updated (${results.errors.length} errors)`,
      },
    }).catch(() => {});
  }

  return results;
};

module.exports = {
  listDepartments,
  createDepartment,
  batchCreateDepartments,
};


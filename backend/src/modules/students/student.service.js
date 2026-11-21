/**
 * src/modules/students/student.service.js
 * Business logic for Student Profiles with strict zone isolation.
 */
const prisma = require('../../config/database');
const { supabaseAdmin } = require('../../config/supabase');
const emailService = require('../../services/emailService');
const emailDeliveryService = require('../../services/emailDelivery.service');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const {
  NotFoundError,
  ZoneAccessError,
  ConflictError,
  ValidationError,
  AppError,
} = require('../../utils/errors');
const { parsePagination, paginationMeta } = require('../../utils/dates');

/**
 * List students with filters.
 * - If officer, zoneId MUST be officer's assigned zone.
 * - If admin, can filter by any zoneId or query all.
 */
const listStudents = async (query = {}, officerZoneId = null) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = {};

  // Zone isolation
  if (officerZoneId) {
    where.zoneId = officerZoneId;
  } else if (query.zoneId) {
    where.zoneId = query.zoneId;
  }

  if (query.institutionId) {
    where.institutionId = query.institutionId;
  }

  if (query.year) {
    where.year = parseInt(query.year, 10);
  }

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.department) {
    where.department = { name: query.department };
  }

  if (query.q) {
    const q = query.q.trim();
    where.OR = [
      { name: { contains: q } },
      { studentId: { contains: q } },
      { user: { email: { contains: q } } },
      { phone: { contains: q } },
    ];
  }

  const [total, students] = await Promise.all([
    prisma.studentProfile.count({ where }),
    prisma.studentProfile.findMany({
      where,
      skip,
      take,
      include: {
        user: { select: { email: true, status: true, lastLoginAt: true } },
        institution: { select: { id: true, name: true, code: true } },
        department: { select: { id: true, name: true } },
        zone: { select: { id: true, name: true, code: true } },
      },
      orderBy: { name: 'asc' },
    }),
  ]);

  const items = students.map((s) => ({
    id: s.id,
    studentId: s.studentId,
    name: s.name,
    email: s.user.email,
    phone: s.phone,
    photoUrl: s.photoUrl,
    institutionId: s.institutionId,
    institutionName: s.institution.name,
    institutionCode: s.institution.code,
    department: s.department?.name || '—',
    year: s.year,
    zoneId: s.zoneId,
    zoneName: s.zone.name,
    groups: s.groups || [],
    status: s.status === 'ACTIVE' ? 'Active' : s.status === 'INACTIVE' ? 'Inactive' : s.status === 'SUSPENDED' ? 'Suspended' : 'Pending Activation',
    lastLoginAt: s.user.lastLoginAt,
    createdAt: s.createdAt,
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

/**
 * Get student by profile ID.
 * Enforces zone isolation for officers.
 */
const getStudentById = async (id, officerZoneId = null) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: {
      user: { select: { email: true, status: true, lastLoginAt: true, createdAt: true } },
      institution: { select: { id: true, name: true, code: true, location: true } },
      department: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, code: true } },
      availabilitySubmissions: {
        orderBy: { weekStart: 'desc' },
        take: 8,
        include: { days: true },
      },
      eventInvitations: {
        orderBy: { invitedAt: 'desc' },
        take: 10,
        include: {
          event: {
            select: {
              id: true,
              title: true,
              category: true,
              date: true,
              mode: true,
              venue: true,
              status: true,
            },
          },
          attendance: true,
        },
      },
    },
  });

  if (!student) {
    throw new NotFoundError(`Student with ID ${id} not found`);
  }

  // Zone isolation check
  if (officerZoneId && student.zoneId !== officerZoneId) {
    throw new ZoneAccessError('You do not have permission to view students from another zone');
  }

  return {
    id: student.id,
    studentId: student.studentId,
    name: student.name,
    email: student.user.email,
    phone: student.phone,
    alternateEmail: student.alternateEmail,
    whatsappEnabled: student.whatsappEnabled,
    photoUrl: student.photoUrl,
    institutionId: student.institutionId,
    institution: student.institution,
    department: student.department?.name || '—',
    year: student.year,
    zoneId: student.zoneId,
    zone: student.zone,
    groups: student.groups || [],
    status: student.status,
    lastLoginAt: student.user.lastLoginAt,
    createdAt: student.createdAt,
    recentAvailability: student.availabilitySubmissions.map((sub) => ({
      id: sub.id,
      weekStart: sub.weekStart,
      status: sub.status.toLowerCase(),
      locked: sub.locked,
      submittedAt: sub.submittedAt,
      availableDaysCount: sub.days.filter((d) => d.availability === 'AVAILABLE').length,
      unavailableDaysCount: sub.days.filter((d) => d.availability === 'UNAVAILABLE').length,
    })),
    recentEvents: student.eventInvitations.map((inv) => ({
      invitationId: inv.id,
      eventId: inv.event.id,
      eventTitle: inv.event.title,
      category: inv.event.category,
      date: inv.event.date,
      mode: inv.event.mode,
      venue: inv.event.venue,
      response: inv.response.toLowerCase(),
      respondedAt: inv.respondedAt,
      attendanceStatus: inv.attendance ? inv.attendance.status.toLowerCase() : null,
    })),
  };
};

/**
 * Get profile of current logged-in student.
 */
const getMyProfile = async (userId) => {
  const student = await prisma.studentProfile.findUnique({
    where: { userId },
    include: {
      user: { select: { email: true, status: true, lastLoginAt: true } },
      institution: { select: { id: true, name: true, code: true, location: true } },
      department: { select: { id: true, name: true } },
      zone: { select: { id: true, name: true, code: true } },
    },
  });

  if (!student) {
    throw new NotFoundError('Student profile not found');
  }

  return {
    id: student.id,
    studentId: student.studentId,
    name: student.name,
    email: student.user.email,
    phone: student.phone,
    alternateEmail: student.alternateEmail,
    whatsappEnabled: student.whatsappEnabled,
    photoUrl: student.photoUrl,
    institutionId: student.institutionId,
    institution: student.institution,
    department: student.department?.name || '—',
    year: student.year,
    zoneId: student.zoneId,
    zone: student.zone,
    groups: student.groups || [],
    status: student.status,
  };
};

/**
 * Update current logged-in student's permitted profile fields.
 */
const updateMyProfile = async (userId, data) => {
  const student = await prisma.studentProfile.findUnique({ where: { userId } });
  if (!student) throw new NotFoundError('Student profile not found');

  return prisma.studentProfile.update({
    where: { userId },
    data: {
      phone: data.phone !== undefined ? data.phone : undefined,
      alternateEmail: data.alternateEmail !== undefined ? data.alternateEmail : undefined,
      whatsappEnabled: data.whatsappEnabled !== undefined ? Boolean(data.whatsappEnabled) : undefined,
      photoUrl: data.photoUrl !== undefined ? data.photoUrl : undefined,
    },
  });
};

/**
 * Admin update student details and institution/zone mapping.
 */
const updateStudentByAdmin = async (id, data, actor) => {
  const student = await prisma.studentProfile.findUnique({ where: { id } });
  if (!student) throw new NotFoundError('Student not found');

  let targetZoneId = data.zoneId;
  // If institution changed, verify and sync zone
  if (data.institutionId && data.institutionId !== student.institutionId) {
    const inst = await prisma.institution.findUnique({ where: { id: data.institutionId } });
    if (!inst) throw new NotFoundError('Target institution not found');
    targetZoneId = inst.zoneId;
  }

  const updated = await prisma.studentProfile.update({
    where: { id },
    data: {
      name: data.name ? data.name.trim() : undefined,
      phone: data.phone !== undefined ? data.phone : undefined,
      year: data.year ? parseInt(data.year, 10) : undefined,
      institutionId: data.institutionId ? data.institutionId : undefined,
      zoneId: targetZoneId !== undefined ? targetZoneId : undefined,
      status: data.status ? data.status.toUpperCase() : undefined,
      groups: data.groups ? data.groups : undefined,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'student.updated',
      category: 'Student',
      description: `Updated student record for ${updated.name} (${updated.studentId})`,
      zoneId: updated.zoneId,
      related: { type: 'student', id: updated.id, label: updated.name },
    },
  });

  return updated;
};

/**
 * Toggle student account status.
 */
const toggleStudentStatus = async (id, status, actor) => {
  const student = await prisma.studentProfile.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!student) throw new NotFoundError('Student not found');

  const newStatus = status.toUpperCase();

  // Update both profile and user auth record
  const [updatedProfile] = await prisma.$transaction([
    prisma.studentProfile.update({
      where: { id },
      data: { status: newStatus },
    }),
    prisma.user.update({
      where: { id: student.userId },
      data: { status: newStatus },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'student.status_changed',
      category: 'Student',
      description: `Changed status of student ${student.name} to ${newStatus}`,
      zoneId: student.zoneId,
      related: { type: 'student', id: student.id, label: student.name },
    },
  });

  return updatedProfile;
};

/**
 * Admin creates a new student account (Provisioning).
 * Derived zone is strictly based on the institution record in MySQL.
 */
const createStudentByAdmin = async (data, actor) => {
  const email = (data.email || '').trim().toLowerCase();
  const registerNumber = (data.registerNumber || '').trim().toUpperCase();

  // 1. Verify institution exists & derive zone (supports ID, code, or name)
  const trimmedInst = (data.institutionId || '').trim();
  const institution = await prisma.institution.findFirst({
    where: {
      OR: [
        { id: trimmedInst },
        { code: trimmedInst },
        { name: trimmedInst },
        { name: { contains: trimmedInst } },
      ],
    },
    select: {
      id: true,
      zoneId: true,
      status: true,
      name: true,
      zone: { select: { id: true, name: true, code: true } },
    },
  });
  if (!institution || (institution.status && institution.status.toUpperCase() === 'INACTIVE')) {
    throw new NotFoundError('Selected institution is not valid or currently inactive');
  }
  if (!institution.zoneId) {
    throw new AppError('Selected institution has no assigned zone', 400);
  }

  // 2. Duplicate checks
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }
  if (registerNumber) {
    const existingReg = await prisma.studentProfile.findFirst({ where: { registerNumber } });
    if (existingReg) {
      throw new ConflictError(`A student with register number "${registerNumber}" already exists`);
    }
  }

  // 3. Create user in Supabase Auth
  const temporaryPassword = data.temporaryPassword || 'Maatram@2026';
  const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name: data.name, role: 'STUDENT', registerNumber },
  });
  if (sbError) {
    throw new AppError(`Supabase identity creation failed: ${sbError.message}`, 400);
  }
  const supabaseUid = sbData.user.id;

  // 4. Create MySQL user + studentProfile in transaction
  try {
    const student = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          supabaseUid,
          email,
          role: 'STUDENT',
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });

      // Generate student ID
      const zone = await tx.zone.findUnique({ where: { id: institution.zoneId } });
      const zoneCode = zone?.code?.replace('ZN-', '') || 'X';
      const count = await tx.studentProfile.count({ where: { zoneId: institution.zoneId } });
      const studentId = `MF-${zoneCode}-${String(count + 1).padStart(4, '0')}`;

      // Resolve department
      let dept = null;
      if (data.department) {
        dept = await tx.department.upsert({
          where: {
            institutionId_name: {
              institutionId: institution.id,
              name: data.department.trim(),
            },
          },
          update: {},
          create: {
            institutionId: institution.id,
            name: data.department.trim(),
          },
        });
      }

      const newProfile = await tx.studentProfile.create({
        data: {
          userId: newUser.id,
          studentId,
          registerNumber: registerNumber || null,
          name: data.name.trim(),
          phone: data.phone || null,
          gender: data.gender || null,
          course: data.course || null,
          academicYear: data.academicYear || null,
          institutionId: institution.id,
          departmentId: dept ? dept.id : null,
          year: parseInt(data.year, 10) || 1,
          zoneId: institution.zoneId,
          status: 'ACTIVE',
          groups: data.groups || [],
        },
        include: {
          institution: { select: { id: true, name: true, code: true } },
          zone: { select: { id: true, name: true, code: true } },
          department: { select: { id: true, name: true } },
        },
      });

      return { user: newUser, profile: newProfile };
    });

    // Automatic Account Activation Email Delivery
    let emailDelivery = null;
    if (data.sendWelcomeEmail !== false) {
      emailDelivery = await emailDeliveryService.queueActivationEmail({
        userId: student.user.id,
        role: 'STUDENT',
        email,
        studentName: data.name,
        name: data.name,
        temporaryPassword,
        institutionName: institution.name || student.profile.institution?.name,
        zoneName: institution.zone?.name || student.profile.zone?.name || 'Assigned Zone',
        portalUrl: env.cors.allowedOrigins[0] ? `${env.cors.allowedOrigins[0]}/login` : 'http://localhost:5173/login',
        asyncMode: false,
      });
    }

    // Audit log
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name || actor.email,
        actorRole: actor.role.toLowerCase(),
        action: 'student.created',
        category: 'Student',
        description: `Created student account for ${data.name} (${student.profile.studentId})`,
        zoneId: student.profile.zoneId,
        related: { type: 'student', id: student.profile.id, label: data.name },
      },
    });

    return student.profile;
  } catch (dbErr) {
    // Rollback Supabase user
    await supabaseAdmin.auth.admin.deleteUser(supabaseUid).catch(() => {});
    throw dbErr;
  }
};

module.exports = {
  listStudents,
  getStudentById,
  getMyProfile,
  updateMyProfile,
  createStudentByAdmin,
  updateStudentByAdmin,
  toggleStudentStatus,
};


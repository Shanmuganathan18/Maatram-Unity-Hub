/**
 * src/modules/admins/admin.service.js
 * Business logic for Admin Dashboard, System Analytics, and Admin Account Management.
 */
const prisma = require('../../config/database');
const { supabaseAdmin } = require('../../config/supabase');
const { todayIST, weekStartOf, parsePagination, paginationMeta } = require('../../utils/dates');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  BadRequestError,
  AppError,
} = require('../../utils/errors');
const emailService = require('../../services/emailService');

const getSystemDashboard = async () => {
  const currentWeek = weekStartOf(todayIST());

  const [
    totalZones,
    activeZones,
    totalOfficers,
    totalInstitutions,
    totalStudents,
    currentWeekSubmissions,
    totalEvents,
    upcomingEvents,
    pendingTickets,
    zones,
    recentAudits,
  ] = await Promise.all([
    prisma.zone.count(),
    prisma.zone.count({ where: { status: 'ACTIVE' } }),
    prisma.officerProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.institution.count({ where: { status: 'ACTIVE' } }),
    prisma.studentProfile.count({ where: { status: 'ACTIVE' } }),
    prisma.availabilitySubmission.findMany({
      where: { weekStart: currentWeek },
      select: { status: true, studentProfile: { select: { zoneId: true } } },
    }),
    prisma.event.count(),
    prisma.event.count({
      where: {
        date: { gte: todayIST() },
        status: { in: ['INVITATIONS_OPEN', 'PUBLISHED', 'IN_PROGRESS'] },
      },
    }),
    prisma.supportTicket.count({
      where: { status: { in: ['OPEN', 'IN_PROGRESS'] } },
    }),
    prisma.zone.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, code: true, name: true, _count: { select: { studentProfiles: true } } },
    }),
    prisma.auditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),
  ]);

  const submittedCount = currentWeekSubmissions.filter((s) => s.status === 'SUBMITTED').length;
  const overallSubmissionRate = totalStudents > 0
    ? Math.round((submittedCount / totalStudents) * 100)
    : 0;

  // Zone comparison stats
  const zoneComparison = zones.map((z) => {
    const zoneSubs = currentWeekSubmissions.filter(
      (s) => s.studentProfile.zoneId === z.id && s.status === 'SUBMITTED',
    ).length;
    const studentCount = z._count.studentProfiles;
    const rate = studentCount > 0 ? Math.round((zoneSubs / studentCount) * 100) : 0;
    return {
      zoneId: z.id,
      zoneCode: z.code,
      zoneName: z.name,
      totalStudents: studentCount,
      submitted: zoneSubs,
      submissionRate: rate,
    };
  });

  return {
    stats: {
      totalZones,
      activeZones,
      totalOfficers,
      totalInstitutions,
      totalStudents,
      submittedCount,
      overallSubmissionRate,
      totalEvents,
      upcomingEvents,
      pendingTickets,
    },
    zoneComparison,
    recentAudits: recentAudits.map((a) => ({
      id: a.id,
      actorName: a.actorName,
      actorRole: a.actorRole,
      action: a.action,
      category: a.category,
      description: a.description,
      at: a.createdAt.getTime(),
    })),
  };
};

/**
 * List all Administrator accounts.
 */
const listAdmins = async (query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = { role: 'ADMIN' };

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.q) {
    const term = query.q.trim();
    where.OR = [
      { email: { contains: term } },
      { adminProfile: { name: { contains: term } } },
      { adminProfile: { adminId: { contains: term } } },
    ];
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      skip,
      take,
      include: {
        adminProfile: true,
      },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = users.map((u) => ({
    id: u.id,
    adminId: u.adminProfile?.adminId || '—',
    name: u.adminProfile?.name || 'Administrator',
    email: u.email,
    phone: u.adminProfile?.phone || null,
    role: 'ADMIN',
    roleLabel: 'Admin',
    status: u.status === 'ACTIVE' ? 'Active' : u.status === 'INACTIVE' ? 'Inactive' : 'Pending Activation',
    lastLoginAt: u.lastLoginAt,
    createdAt: u.createdAt,
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

/**
 * Create or invite a new Administrator account.
 * Only authenticated Admins can call this method.
 */
const createAdmin = async (data, actor) => {
  const email = data.email.trim().toLowerCase();
  const name = data.name.trim();
  const phone = data.phone ? data.phone.trim() : null;

  // 1. Check duplicate
  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('A user with this email address already exists');
  }

  // 2. Create in Supabase Auth
  let supabaseUid;
  try {
    const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password || 'MaatramAdmin@2026',
      email_confirm: true,
      user_metadata: { name, role: 'ADMIN' },
    });

    if (sbError) {
      if (sbError.message && sbError.message.includes('already registered')) {
        const { data: listData } = await supabaseAdmin.auth.admin.listUsers();
        const matched = listData?.users?.find((u) => u.email.toLowerCase() === email);
        if (matched) supabaseUid = matched.id;
        else throw new AppError(`Supabase error: ${sbError.message}`, 500);
      } else {
        throw new AppError(`Supabase error: ${sbError.message}`, 500);
      }
    } else {
      supabaseUid = sbData.user.id;
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    supabaseUid = `00000000-0000-0000-0000-${String(Date.now()).padStart(12, '0').slice(-12)}`;
  }

  // 3. Ensure 'admin' AppRole exists
  await prisma.appRole.upsert({
    where: { id: 'admin' },
    update: { label: 'Admin', description: 'Full system-wide administrative access', editable: false },
    create: { id: 'admin', label: 'Admin', description: 'Full system-wide administrative access', editable: false },
  });

  // 4. Generate sequential Admin ID
  const count = await prisma.adminProfile.count();
  const adminId = `ADM-${String(count + 1).padStart(3, '0')}`;

  // 5. Create User and AdminProfile in database
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        supabaseUid,
        email,
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    });

    const profile = await tx.adminProfile.create({
      data: {
        userId: user.id,
        adminId,
        name,
        phone,
        roleId: 'admin',
        status: 'ACTIVE',
      },
    });

    return { user, profile };
  });

  // 6. Send invitation / onboarding email
  try {
    await emailService.sendEmail({
      to: email,
      subject: 'Welcome to Maatram Admin Portal',
      html: `
        <h2>Welcome to Maatram Foundation</h2>
        <p>Hello ${name},</p>
        <p>You have been invited as an <strong>Administrator</strong> for the Maatram Student Availability Planner.</p>
        <p>Your Admin ID: <strong>${adminId}</strong></p>
        <p>You can access the Admin Portal at <a href="http://localhost:5175">http://localhost:5175</a>.</p>
      `,
    });
  } catch (emailErr) {
    // Non-fatal, invitation logged
  }

  // 7. Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: 'admin',
      action: 'admin.created',
      category: 'Admin Management',
      description: `Created new Administrator account for ${name} (${email}) with ID ${adminId}`,
      related: { type: 'admin', id: result.profile.id, adminId },
    },
  });

  return {
    id: result.user.id,
    adminId: result.profile.adminId,
    name: result.profile.name,
    email: result.user.email,
    phone: result.profile.phone,
    role: 'ADMIN',
    roleLabel: 'Admin',
    status: 'Active',
    createdAt: result.user.createdAt,
  };
};

/**
 * Toggle Administrator account status.
 * Prevents self-deactivation and preserves at least one active Admin.
 */
const toggleAdminStatus = async (userId, newStatus, actor) => {
  const targetUser = await prisma.user.findUnique({
    where: { id: userId },
    include: { adminProfile: true },
  });

  if (!targetUser || targetUser.role !== 'ADMIN') {
    throw new NotFoundError('Admin account not found');
  }

  const statusUpper = newStatus.toUpperCase();

  // Guard: Cannot deactivate own account
  if (actor.id === userId && statusUpper !== 'ACTIVE') {
    throw new BadRequestError('You cannot deactivate your own Administrator account');
  }

  // Guard: At least one active Admin must remain
  if (statusUpper !== 'ACTIVE') {
    const activeAdmins = await prisma.user.count({
      where: { role: 'ADMIN', status: 'ACTIVE' },
    });
    if (activeAdmins <= 1) {
      throw new BadRequestError('At least one active Administrator account must remain in the system');
    }
  }

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: userId },
      data: { status: statusUpper },
    });
    await tx.adminProfile.updateMany({
      where: { userId },
      data: { status: statusUpper },
    });
  });

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: 'admin',
      action: 'admin.status_toggled',
      category: 'Admin Management',
      description: `Updated status of Admin ${targetUser.adminProfile?.name || targetUser.email} to ${statusUpper}`,
      related: { type: 'admin', id: userId, email: targetUser.email },
    },
  });

  return {
    id: userId,
    status: statusUpper === 'ACTIVE' ? 'Active' : statusUpper === 'INACTIVE' ? 'Inactive' : 'Suspended',
  };
};

/**
 * Get administrative activity logs.
 */
const getAdminActivity = async (query = {}) => {
  const { page, perPage, skip, take } = parsePagination(query);
  const where = { actorRole: 'admin' };

  if (query.action) where.action = query.action;

  const [total, logs] = await Promise.all([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  const items = logs.map((l) => ({
    id: l.id,
    actorId: l.actorId,
    actorName: l.actorName,
    actorRole: 'Admin',
    action: l.action,
    category: l.category,
    description: l.description,
    related: l.related,
    at: l.createdAt.getTime(),
    createdAt: l.createdAt,
  }));

  return {
    items,
    meta: paginationMeta({ page, perPage, total }),
  };
};

module.exports = {
  getSystemDashboard,
  listAdmins,
  createAdmin,
  toggleAdminStatus,
  getAdminActivity,
};

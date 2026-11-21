/**
 * src/modules/officers/officer.service.js
 * Business logic for Officer management and Officer Dashboard.
 */
const prisma = require('../../config/database');
const { supabaseAdmin } = require('../../config/supabase');
const emailService = require('../../services/emailService');
const emailDeliveryService = require('../../services/emailDelivery.service');
const env = require('../../config/env');
const logger = require('../../utils/logger');
const {
  NotFoundError,
  ConflictError,
  ValidationError,
  AppError,
} = require('../../utils/errors');
const { todayIST, weekStartOf, deadlineFor } = require('../../utils/dates');

/**
 * Officer dashboard statistics.
 * Strictly calculated from database for the officer's assigned zone.
 */
const getOfficerDashboard = async (officerProfile) => {
  const zoneId = officerProfile.zoneId;
  const currentWeek = weekStartOf(todayIST());

  const [
    totalStudents,
    totalInstitutions,
    activeEvents,
    currentWeekSubmissions,
    pendingResponses,
    recentActivity,
  ] = await Promise.all([
    // Total students in zone
    prisma.studentProfile.count({
      where: { zoneId, status: 'ACTIVE' },
    }),
    // Total institutions in zone
    prisma.institution.count({
      where: { zoneId, status: 'ACTIVE' },
    }),
    // Upcoming / open events in zone
    prisma.event.findMany({
      where: {
        zoneId,
        status: { in: ['INVITATIONS_OPEN', 'PUBLISHED', 'IN_PROGRESS'] },
      },
      include: {
        _count: { select: { invitations: true } },
      },
      orderBy: { date: 'asc' },
      take: 5,
    }),
    // Current week submissions in zone
    prisma.availabilitySubmission.findMany({
      where: {
        weekStart: currentWeek,
        studentProfile: { zoneId },
      },
      select: { status: true },
    }),
    // Pending invitations in zone
    prisma.eventInvitation.count({
      where: {
        response: 'PENDING',
        event: { zoneId },
      },
    }),
    // Recent activity in zone
    prisma.activityLog.findMany({
      where: { zoneId },
      orderBy: { createdAt: 'desc' },
      take: 8,
    }),
  ]);

  const submittedCount = currentWeekSubmissions.filter((s) => s.status === 'SUBMITTED').length;
  const draftCount = currentWeekSubmissions.filter((s) => s.status === 'DRAFT').length;
  const notSubmittedCount = Math.max(0, totalStudents - currentWeekSubmissions.length);
  const submissionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

  return {
    officer: {
      name: officerProfile.name,
      designation: officerProfile.designation,
      zoneId: officerProfile.zoneId,
    },
    stats: {
      totalStudents,
      totalInstitutions,
      submittedCount,
      draftCount,
      notSubmittedCount,
      submissionRate,
      pendingResponses,
    },
    upcomingEvents: activeEvents.map((e) => ({
      id: e.id,
      title: e.title,
      category: e.category.toLowerCase(),
      date: e.date,
      startTime: e.startTime,
      mode: e.mode.toLowerCase(),
      venue: e.venue,
      status: e.status.toLowerCase(),
      invitationCount: e._count.invitations,
    })),
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      actorName: a.actorName,
      type: a.type,
      description: a.description,
      at: a.createdAt.getTime(),
      related: a.related,
    })),
  };
};

/**
 * List all officers (Admin only).
 */
const listOfficers = async (query = {}) => {
  const where = {};
  if (query.zoneId) where.zoneId = query.zoneId;
  if (query.status) where.status = query.status.toUpperCase();

  const officers = await prisma.officerProfile.findMany({
    where,
    include: {
      zone: { select: { id: true, code: true, name: true } },
      user: { select: { email: true, status: true, lastLoginAt: true } },
      _count: { select: { eventsCreated: true } },
    },
    orderBy: { name: 'asc' },
  });

  return officers.map((o) => ({
    id: o.id,
    officerId: o.officerId,
    name: o.name,
    email: o.user.email,
    phone: o.phone,
    designation: o.designation,
    photoUrl: o.photoUrl,
    zoneId: o.zoneId,
    zoneName: o.zone?.name || 'Unassigned',
    zoneCode: o.zone?.code || null,
    status: o.status === 'ACTIVE' ? 'Active' : o.status === 'INACTIVE' ? 'Inactive' : 'Pending Activation',
    eventsCount: o._count.eventsCreated,
    lastLoginAt: o.user.lastLoginAt,
    createdAt: o.createdAt,
  }));
};

/**
 * Create or invite officer (Admin only).
 * Creates Supabase Auth user via admin client, then creates OfficerProfile.
 */
const createOfficer = async (data, actor) => {
  const email = data.email.trim().toLowerCase();

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (existingUser) {
    throw new ConflictError('A user with this email already exists');
  }

  // 1. Verify zone if supplied
  let zone = null;
  if (data.zoneId) {
    zone = await prisma.zone.findUnique({ where: { id: data.zoneId } });
    if (!zone) throw new NotFoundError('Selected zone not found');
  }

  // 2. Create Supabase Auth user
  const temporaryPassword = data.temporaryPassword || data.password || 'Maatram@2026';
  const { data: sbData, error: sbError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: temporaryPassword,
    email_confirm: true,
    user_metadata: { name: data.name, role: 'OFFICER' },
  });

  if (sbError) {
    throw new AppError(`Supabase error: ${sbError.message}`, 500);
  }

  const supabaseUid = sbData.user.id;

  // 3. Generate Officer ID: OFF-<ZoneLetter>-<Seq>
  const zoneLetter = zone?.code?.replace('ZN-', '') || 'X';
  const count = await prisma.officerProfile.count();
  const officerId = `OFF-${zoneLetter}-${String(count + 1).padStart(3, '0')}`;

  let officer;
  try {
    officer = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          supabaseUid,
          email,
          role: 'OFFICER',
          status: 'ACTIVE',
          mustChangePassword: true,
        },
      });

      return tx.officerProfile.create({
        data: {
          userId: user.id,
          officerId,
          employeeId: data.employeeId ? data.employeeId.trim().toUpperCase() : null,
          name: data.name.trim(),
          phone: data.phone || null,
          designation: data.designation ? data.designation.trim() : 'Zone Officer',
          zoneId: data.zoneId || null,
          status: 'ACTIVE',
        },
        include: {
          zone: true,
        },
      });
    });
  } catch (dbErr) {
    // Rollback Supabase user
    await supabaseAdmin.auth.admin.deleteUser(supabaseUid).catch(() => {});
    throw dbErr;
  }

  // Automatic Account Activation Email Delivery
  let emailDelivery = null;
  if (data.sendWelcomeEmail !== false) {
    emailDelivery = await emailDeliveryService.queueActivationEmail({
      userId: officer.userId,
      role: 'OFFICER',
      email,
      officerName: data.name,
      name: data.name,
      designation: officer.designation,
      zoneName: zone?.name || 'Assigned Zone',
      temporaryPassword,
      portalUrl: env.cors.allowedOrigins[1] ? `${env.cors.allowedOrigins[1]}/login` : 'http://localhost:5174/login',
      asyncMode: false,
    });
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'officer.created',
      category: 'Officer',
      description: `Created officer account for ${officer.name} (${officer.officerId})`,
      zoneId: officer.zoneId,
      related: { type: 'officer', id: officer.id, label: officer.name },
    },
  });

  return officer;
};

/**
 * Toggle officer account status (Admin only).
 */
const toggleOfficerStatus = async (officerId, status, actor) => {
  const officer = await prisma.officerProfile.findUnique({
    where: { id: officerId },
    include: { user: true },
  });
  if (!officer) throw new NotFoundError('Officer not found');

  const newStatus = status.toUpperCase();
  const [updatedProfile] = await prisma.$transaction([
    prisma.officerProfile.update({
      where: { id: officerId },
      data: { status: newStatus },
    }),
    prisma.user.update({
      where: { id: officer.userId },
      data: { status: newStatus },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'officer.status_changed',
      category: 'Officer',
      description: `Changed status of officer ${officer.name} to ${newStatus}`,
      zoneId: officer.zoneId,
      related: { type: 'officer', id: officer.id, label: officer.name },
    },
  });

  return updatedProfile;
};

/**
 * Resend officer invitation / welcome email.
 */
const resendOfficerInvite = async (officerId, actor) => {
  const officer = await prisma.officerProfile.findUnique({
    where: { id: officerId },
    include: { user: true, zone: true },
  });
  if (!officer) throw new NotFoundError('Officer not found');

  const temporaryPassword = 'Maatram@' + Math.floor(1000 + Math.random() * 9000);
  const result = await emailDeliveryService.resendActivationByUserId(officer.userId, temporaryPassword, actor);

  return { success: true, email: officer.user.email, delivery: result };
};

/**
 * Reassign officer to another zone.
 */
const reassignOfficerZone = async (officerId, newZoneId, actor) => {
  const officer = await prisma.officerProfile.findUnique({ where: { id: officerId } });
  if (!officer) throw new NotFoundError('Officer not found');

  const zone = await prisma.zone.findUnique({ where: { id: newZoneId } });
  if (!zone) throw new NotFoundError('Target zone not found');

  const updated = await prisma.officerProfile.update({
    where: { id: officerId },
    data: { zoneId: newZoneId },
  });

  await prisma.auditLog.create({
    data: {
      actorId: actor.id,
      actorName: actor.name || actor.email,
      actorRole: actor.role.toLowerCase(),
      action: 'officer.reassigned',
      category: 'Officer',
      description: `Reassigned ${officer.name} to zone ${zone.name}`,
      zoneId: newZoneId,
      related: { type: 'officer', id: officer.id, label: officer.name },
    },
  });

  return updated;
};

module.exports = {
  getOfficerDashboard,
  listOfficers,
  createOfficer,
  toggleOfficerStatus,
  resendOfficerInvite,
  reassignOfficerZone,
};


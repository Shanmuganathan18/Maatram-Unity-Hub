/**
 * src/modules/events/event.service.js
 * Business logic for Events and audience resolution.
 */
const prisma = require('../../config/database');
const {
  NotFoundError,
  ValidationError,
  ZoneAccessError,
  AppError,
} = require('../../utils/errors');
const { weekStartOf, todayIST } = require('../../utils/dates');
const { createNotification } = require('../../services/notificationService');
const { sendEventInvitationEmail } = require('../../services/emailService');
const logger = require('../../utils/logger');

// Allowed status transitions per specification
const ALLOWED_TRANSITIONS = {
  DRAFT: ['PUBLISHED', 'INVITATIONS_OPEN', 'CANCELLED'],
  PUBLISHED: ['INVITATIONS_OPEN', 'POSTPONED', 'CANCELLED'],
  INVITATIONS_OPEN: ['IN_PROGRESS', 'POSTPONED', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED'],
  POSTPONED: ['INVITATIONS_OPEN', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

/**
 * List events.
 * - For officer: strictly filtered to officer's zone.
 * - For student: events the student is invited to or eligible for.
 * - For admin: system-wide with optional zone filter.
 */
const listEvents = async (query = {}, officerZoneId = null) => {
  const where = {};

  if (officerZoneId) {
    where.zoneId = officerZoneId;
  } else if (query.zoneId) {
    where.zoneId = query.zoneId;
  }

  if (query.category) {
    where.category = query.category.toUpperCase();
  }

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.from) {
    where.date = { gte: query.from };
  }

  if (query.to) {
    where.date = { ...(where.date || {}), lte: query.to };
  }

  if (query.q) {
    where.title = { contains: query.q.trim() };
  }

  const events = await prisma.event.findMany({
    where,
    include: {
      zone: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true, designation: true } },
      targetInstitutions: {
        include: { institution: { select: { id: true, name: true, code: true } } },
      },
      _count: {
        select: {
          invitations: true,
        },
      },
    },
    orderBy: { date: 'desc' },
  });

  return events.map((e) => ({
    id: e.id,
    title: e.title,
    category: e.category.toLowerCase(),
    description: e.description,
    date: e.date,
    startTime: e.startTime,
    endTime: e.endTime,
    mode: e.mode.toLowerCase(),
    venue: e.venue,
    address: e.address,
    platform: e.platform,
    meetingLink: e.meetingLink,
    status: e.status.toLowerCase(),
    capacity: e.capacity,
    waitlistEnabled: e.waitlistEnabled,
    responseDeadline: e.responseDeadline,
    originalDate: e.originalDate,
    statusNote: e.statusNote,
    zoneId: e.zoneId,
    zoneName: e.zone.name,
    organizerName: e.createdBy.name,
    targetInstitutions: e.targetInstitutions.map((ti) => ({
      id: ti.institution.id,
      name: ti.institution.name,
      code: ti.institution.code,
    })),
    invitationCount: e._count.invitations,
    createdAt: e.createdAt,
  }));
};

/**
 * Get event details by ID with stats and questions.
 */
const getEventById = async (id, officerZoneId = null) => {
  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      zone: { select: { id: true, name: true, code: true } },
      createdBy: {
        select: { id: true, name: true, designation: true, phone: true, user: { select: { email: true } } },
      },
      targetInstitutions: {
        include: { institution: { select: { id: true, name: true, code: true, location: true } } },
      },
      questions: { orderBy: { order: 'asc' } },
      invitations: {
        select: {
          id: true,
          response: true,
          studentProfileId: true,
          attendance: { select: { status: true } },
        },
      },
    },
  });

  if (!event) throw new NotFoundError('Event not found');

  if (officerZoneId && event.zoneId !== officerZoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  // Calculate response stats
  const stats = {
    invited: event.invitations.length,
    accepted: event.invitations.filter((i) => i.response === 'ACCEPTED').length,
    declined: event.invitations.filter((i) => i.response === 'DECLINED').length,
    pending: event.invitations.filter((i) => i.response === 'PENDING').length,
    withdrawn: event.invitations.filter((i) => i.response === 'WITHDRAWN').length,
    waitlisted: event.invitations.filter((i) => i.response === 'WAITLISTED').length,
    present: event.invitations.filter((i) => i.attendance?.status === 'PRESENT').length,
    absent: event.invitations.filter((i) => i.attendance?.status === 'ABSENT').length,
    excused: event.invitations.filter((i) => i.attendance?.status === 'EXCUSED').length,
    seatsLeft: event.capacity
      ? Math.max(0, event.capacity - event.invitations.filter((i) => i.response === 'ACCEPTED').length)
      : null,
  };

  return {
    ...event,
    category: event.category.toLowerCase(),
    mode: event.mode.toLowerCase(),
    status: event.status.toLowerCase(),
    stats,
    targetInstitutions: event.targetInstitutions.map((ti) => ti.institution),
    organizer: {
      name: event.createdBy.name,
      designation: event.createdBy.designation,
      email: event.createdBy.user.email,
      phone: event.createdBy.phone,
    },
  };
};

/**
 * Create event as DRAFT (Officer only).
 * Zone is always derived from the authenticated officer.
 */
const createEvent = async (officerProfile, data) => {
  const zoneId = officerProfile.zoneId;
  if (!zoneId) throw new ZoneAccessError('Officer does not have an assigned zone');

  // Verify all target institutions belong to officer's zone
  if (data.targetInstitutionIds && data.targetInstitutionIds.length > 0) {
    const validInstitutions = await prisma.institution.findMany({
      where: {
        id: { in: data.targetInstitutionIds },
        zoneId,
      },
      select: { id: true },
    });

    if (validInstitutions.length !== data.targetInstitutionIds.length) {
      throw new ZoneAccessError('One or more selected institutions do not belong to your zone');
    }
  }

  const category = data.category.toUpperCase();
  const mode = data.mode ? data.mode.toUpperCase() : 'PHYSICAL';

  const event = await prisma.event.create({
    data: {
      zoneId,
      createdById: officerProfile.id,
      title: data.title.trim(),
      category,
      description: data.description ? data.description.trim() : null,
      date: data.date,
      startTime: data.startTime || null,
      endTime: data.endTime || null,
      mode,
      venue: data.venue ? data.venue.trim() : null,
      address: data.address ? data.address.trim() : null,
      platform: data.platform || null,
      meetingLink: data.meetingLink || null,
      instructions: data.instructions || null,
      status: 'DRAFT',
      capacity: data.capacity ? parseInt(data.capacity, 10) : null,
      waitlistEnabled: Boolean(data.waitlistEnabled),
      responseDeadline: data.responseDeadline ? new Date(data.responseDeadline) : null,
      targetYears: data.targetYears || [],
      targetGroups: data.targetGroups || [],
      targetDepts: data.targetDepts || [],
      targetInstitutions: data.targetInstitutionIds
        ? {
            create: data.targetInstitutionIds.map((instId) => ({
              institutionId: instId,
            })),
          }
        : undefined,
      questions: data.questions
        ? {
            create: data.questions.map((q, idx) => ({
              type: q.type.toUpperCase(),
              label: q.label,
              required: Boolean(q.required),
              order: idx + 1,
              options: q.options || [],
            })),
          }
        : undefined,
    },
    include: {
      questions: true,
      targetInstitutions: true,
    },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      zoneId,
      actorId: officerProfile.userId,
      actorName: officerProfile.name,
      type: 'event_created',
      description: `Created event "${event.title}" as draft`,
      related: { type: 'event', id: event.id, label: event.title },
    },
  });

  return event;
};

/**
 * Resolve target students and dispatch invitations when event opens.
 */
const resolveAndDispatchInvitations = async (eventId, officerZoneId) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      targetInstitutions: true,
      questions: true,
    },
  });

  if (!event) throw new NotFoundError('Event not found');

  // Build student filter
  const targetInstIds = event.targetInstitutions.map((ti) => ti.institutionId);
  const studentWhere = {
    zoneId: officerZoneId,
    status: 'ACTIVE',
  };

  if (targetInstIds.length > 0) {
    studentWhere.institutionId = { in: targetInstIds };
  }

  const targetYears = event.targetYears;
  if (Array.isArray(targetYears) && targetYears.length > 0) {
    studentWhere.year = { in: targetYears };
  }

  const students = await prisma.studentProfile.findMany({
    where: studentWhere,
    include: {
      user: { select: { id: true, email: true } },
    },
  });

  // If PHYSICAL_VERIFICATION, filter to students who are AVAILABLE on event date
  let eligibleStudents = students;
  if (event.category === 'PHYSICAL_VERIFICATION') {
    const ws = weekStartOf(event.date);
    const availableSubmissions = await prisma.availabilitySubmission.findMany({
      where: {
        studentProfileId: { in: students.map((s) => s.id) },
        weekStart: ws,
        status: 'SUBMITTED',
        days: {
          some: {
            date: event.date,
            availability: 'AVAILABLE',
          },
        },
      },
      select: { studentProfileId: true },
    });

    const availableIds = new Set(availableSubmissions.map((s) => s.studentProfileId));
    eligibleStudents = students.filter((s) => availableIds.has(s.id));
  }

  // Check existing invitations to prevent duplicates
  const existingInvitations = await prisma.eventInvitation.findMany({
    where: { eventId },
    select: { studentProfileId: true },
  });
  const existingIds = new Set(existingInvitations.map((i) => i.studentProfileId));

  const newStudents = eligibleStudents.filter((s) => !existingIds.has(s.id));

  // Batch insert new invitations
  for (const s of newStudents) {
    await prisma.eventInvitation.create({
      data: {
        eventId,
        studentProfileId: s.id,
        response: 'PENDING',
      },
    });

    // Notify student (In-app + email)
    await createNotification({
      userId: s.user.id,
      category: 'event_invitation',
      title: `New Invitation: ${event.title}`,
      body: `You are invited to ${event.title} on ${event.date}. Please respond before the deadline.`,
      link: { type: 'event', eventId: event.id },
      idempotencyKey: `inv-${event.id}-${s.id}`,
    });

    if (s.user.email) {
      await sendEventInvitationEmail(s.user.email, s.name, event);
    }
  }

  return newStudents.length;
};

/**
 * Change event status (Publish, Postpone, Cancel).
 */
const changeEventStatus = async (officerProfile, eventId, newStatus, payload = {}) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      invitations: {
        include: {
          studentProfile: {
            include: { user: { select: { id: true, email: true } } },
          },
        },
      },
    },
  });

  if (!event) throw new NotFoundError('Event not found');
  if (event.zoneId !== officerProfile.zoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  const current = event.status;
  const target = newStatus.toUpperCase();

  const allowed = ALLOWED_TRANSITIONS[current] || [];
  if (!allowed.includes(target)) {
    throw new ValidationError(`Cannot transition event from ${current} to ${target}`);
  }

  const updateData = { status: target };

  if (target === 'POSTPONED') {
    if (!payload.newDate || payload.newDate <= todayIST()) {
      throw new ValidationError('New date must be in the future');
    }
    updateData.originalDate = event.date;
    updateData.date = payload.newDate;
    updateData.statusNote = payload.reason || 'Postponed by zone officer';
  } else if (target === 'CANCELLED') {
    updateData.statusNote = payload.reason || 'Cancelled by zone officer';
  }

  const updated = await prisma.event.update({
    where: { id: eventId },
    data: updateData,
  });

  // If opening invitations, resolve and send
  let invitedCount = 0;
  if (target === 'INVITATIONS_OPEN') {
    invitedCount = await resolveAndDispatchInvitations(eventId, officerProfile.zoneId);
  }

  // If postponed or cancelled, notify all invited students
  if (['POSTPONED', 'CANCELLED'].includes(target)) {
    for (const inv of event.invitations) {
      await createNotification({
        userId: inv.studentProfile.user.id,
        category: target === 'POSTPONED' ? 'event_postponed' : 'event_cancelled',
        title: `Event ${target === 'POSTPONED' ? 'Postponed' : 'Cancelled'}: ${event.title}`,
        body: updateData.statusNote,
        link: { type: 'event', eventId: event.id },
      });
    }
  }

  // Audit activity
  await prisma.activityLog.create({
    data: {
      zoneId: officerProfile.zoneId,
      actorId: officerProfile.userId,
      actorName: officerProfile.name,
      type: `event_${target.toLowerCase()}`,
      description: `Event moved to ${target}${invitedCount ? ` (${invitedCount} students invited)` : ''}`,
      related: { type: 'event', id: event.id, label: event.title },
    },
  });

  return { ...updated, invitedCount };
};

/**
 * Bulk / Batch import events from CSV or Excel data.
 */
const batchCreateEvents = async (items = [], actor = {}) => {
  const results = { created: 0, errors: [] };
  for (let i = 0; i < items.length; i++) {
    const row = items[i];
    try {
      const title = (row.title || '').trim();
      const dateStr = (row.date || '').trim();
      if (!title || !dateStr) {
        results.errors.push({ row: i + 1, error: 'Title and Event Date (YYYY-MM-DD) are required' });
        continue;
      }

      // Resolve zoneId
      let zoneId = row.zoneId;
      if (!zoneId && (row.zoneCode || row.zone)) {
        const zQ = (row.zoneCode || row.zone).trim();
        const z = await prisma.zone.findFirst({
          where: { OR: [{ id: zQ }, { code: zQ }, { name: zQ }] },
        });
        if (z) zoneId = z.id;
      }
      if (!zoneId) zoneId = 'zone-a';

      const eventDate = new Date(dateStr);
      if (isNaN(eventDate.getTime())) {
        results.errors.push({ row: i + 1, title, error: `Invalid date format "${dateStr}"` });
        continue;
      }

      await prisma.event.create({
        data: {
          title,
          description: row.description?.trim() || null,
          category: row.category?.toUpperCase() || 'TRAINING',
          date: eventDate,
          startTime: row.startTime || '09:30',
          endTime: row.endTime || '16:30',
          location: row.location?.trim() || 'Online',
          zoneId,
          status: 'UPCOMING',
          createdById: actor.id || 'admin',
        },
      });
      results.created++;
    } catch (err) {
      results.errors.push({ row: i + 1, title: row.title, error: err.message });
    }
  }

  if (actor.id) {
    await prisma.auditLog.create({
      data: {
        actorId: actor.id,
        actorName: actor.name || actor.email || 'Admin',
        actorRole: (actor.role || 'admin').toLowerCase(),
        action: 'event.batch_import',
        category: 'Event',
        description: `Bulk imported ${results.created} events (${results.errors.length} errors)`,
      },
    }).catch(() => {});
  }

  return results;
};

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  changeEventStatus,
  resolveAndDispatchInvitations,
  batchCreateEvents,
};

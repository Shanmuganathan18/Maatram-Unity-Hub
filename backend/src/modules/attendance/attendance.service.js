/**
 * src/modules/attendance/attendance.service.js
 * Business logic for Recording and Tracking Attendance.
 */
const prisma = require('../../config/database');
const { NotFoundError, ZoneAccessError, ValidationError } = require('../../utils/errors');

/**
 * Get attendance sheet for an event (confirmed participants).
 */
const getEventAttendanceSheet = async (eventId, officerZoneId = null) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { id: true, title: true, date: true, status: true, zoneId: true },
  });

  if (!event) throw new NotFoundError('Event not found');
  if (officerZoneId && event.zoneId !== officerZoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  // Get all accepted invitations for this event
  const invitations = await prisma.eventInvitation.findMany({
    where: {
      eventId,
      response: 'ACCEPTED',
    },
    include: {
      studentProfile: {
        include: {
          institution: { select: { name: true, code: true } },
          department: { select: { name: true } },
        },
      },
      attendance: true,
    },
    orderBy: { studentProfile: { name: 'asc' } },
  });

  return {
    event,
    participants: invitations.map((inv) => ({
      invitationId: inv.id,
      studentId: inv.studentProfile.id,
      studentCode: inv.studentProfile.studentId,
      name: inv.studentProfile.name,
      phone: inv.studentProfile.phone,
      institution: inv.studentProfile.institution.name,
      department: inv.studentProfile.department?.name || '—',
      year: inv.studentProfile.year,
      attendance: inv.attendance
        ? {
            id: inv.attendance.id,
            status: inv.attendance.status.toLowerCase(),
            note: inv.attendance.note,
            recordedAt: inv.attendance.recordedAt,
          }
        : null,
    })),
  };
};

/**
 * Mark or update attendance for a single participant.
 */
const markAttendance = async (invitationId, status, note = null, actor) => {
  const inv = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });

  if (!inv) throw new NotFoundError('Invitation not found');

  // If officer, verify zone
  if (actor.role === 'OFFICER' && inv.event.zoneId !== actor.zoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  const attendanceStatus = status.toUpperCase();
  if (!['PRESENT', 'ABSENT', 'EXCUSED'].includes(attendanceStatus)) {
    throw new ValidationError('Invalid attendance status');
  }

  return prisma.$transaction(async (tx) => {
    const existing = await tx.attendance.findUnique({
      where: { invitationId },
    });

    const att = await tx.attendance.upsert({
      where: { invitationId },
      update: {
        status: attendanceStatus,
        note: note ? note.trim() : undefined,
        recordedById: actor.id,
        recordedAt: new Date(),
      },
      create: {
        invitationId,
        status: attendanceStatus,
        note: note ? note.trim() : null,
        recordedById: actor.id,
      },
    });

    // Record history
    await tx.attendanceHistory.create({
      data: {
        attendanceId: att.id,
        fromStatus: existing ? existing.status : null,
        toStatus: attendanceStatus,
        note: note || 'Attendance updated',
        actorId: actor.id,
        actorName: actor.name || actor.email,
      },
    });

    return att;
  });
};

/**
 * Bulk record attendance.
 */
const bulkMarkAttendance = async (eventId, records, actor) => {
  const event = await prisma.event.findUnique({ where: { id: eventId } });
  if (!event) throw new NotFoundError('Event not found');

  if (actor.role === 'OFFICER' && event.zoneId !== actor.zoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  const results = [];
  for (const rec of records) {
    if (rec.invitationId && rec.status) {
      const att = await markAttendance(rec.invitationId, rec.status, rec.note, actor);
      results.push(att);
    }
  }

  // Activity log
  if (actor.role === 'OFFICER') {
    await prisma.activityLog.create({
      data: {
        zoneId: actor.zoneId,
        actorId: actor.id,
        actorName: actor.name,
        type: 'attendance_updated',
        description: `Updated attendance for ${results.length} students in "${event.title}"`,
        related: { type: 'event', id: event.id, label: event.title },
      },
    });
  }

  return { updatedCount: results.length };
};

module.exports = {
  getEventAttendanceSheet,
  markAttendance,
  bulkMarkAttendance,
};


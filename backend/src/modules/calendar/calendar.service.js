/**
 * src/modules/calendar/calendar.service.js
 * Formats events and milestones for FullCalendar.
 */
const prisma = require('../../config/database');

const STATUS_COLORS = {
  accepted: { bg: '#10b981', border: '#059669', text: '#ffffff' }, // Emerald
  pending: { bg: '#f59e0b', border: '#d97706', text: '#ffffff' }, // Amber
  declined: { bg: '#ef4444', border: '#dc2626', text: '#ffffff' }, // Red
  completed: { bg: '#64748b', border: '#475569', text: '#ffffff' }, // Slate
  cancelled: { bg: '#94a3b8', border: '#64748b', text: '#ffffff' },
  default: { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Blue
};

/**
 * Calendar events for student.
 */
const getStudentCalendar = async (studentProfileId) => {
  const invitations = await prisma.eventInvitation.findMany({
    where: { studentProfileId },
    include: {
      event: {
        include: { zone: { select: { name: true } } },
      },
      attendance: true,
    },
  });

  return invitations.map((inv) => {
    const e = inv.event;
    const isCompleted = e.status === 'COMPLETED';
    const isCancelled = e.status === 'CANCELLED';

    let colorKey = 'default';
    if (isCancelled) colorKey = 'cancelled';
    else if (isCompleted) colorKey = 'completed';
    else if (inv.response === 'ACCEPTED') colorKey = 'accepted';
    else if (inv.response === 'PENDING') colorKey = 'pending';
    else if (inv.response === 'DECLINED') colorKey = 'declined';

    const colors = STATUS_COLORS[colorKey] || STATUS_COLORS.default;

    return {
      id: e.id,
      title: e.title,
      start: e.startTime ? `${e.date}T${e.startTime}:00` : e.date,
      end: e.endTime ? `${e.date}T${e.endTime}:00` : undefined,
      allDay: !e.startTime,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        category: e.category.toLowerCase(),
        mode: e.mode.toLowerCase(),
        venue: e.venue,
        response: inv.response.toLowerCase(),
        eventStatus: e.status.toLowerCase(),
        attendance: inv.attendance ? inv.attendance.status.toLowerCase() : null,
      },
    };
  });
};

/**
 * Calendar events for zone officer.
 */
const getZoneCalendar = async (officerZoneId) => {
  const events = await prisma.event.findMany({
    where: { zoneId: officerZoneId },
    include: {
      _count: { select: { invitations: true } },
    },
  });

  return events.map((e) => {
    let colorKey = 'default';
    if (e.status === 'CANCELLED') colorKey = 'cancelled';
    else if (e.status === 'COMPLETED') colorKey = 'completed';
    else if (e.status === 'INVITATIONS_OPEN') colorKey = 'accepted';
    else if (e.status === 'DRAFT') colorKey = 'pending';

    const colors = STATUS_COLORS[colorKey] || STATUS_COLORS.default;

    return {
      id: e.id,
      title: e.title,
      start: e.startTime ? `${e.date}T${e.startTime}:00` : e.date,
      end: e.endTime ? `${e.date}T${e.endTime}:00` : undefined,
      allDay: !e.startTime,
      backgroundColor: colors.bg,
      borderColor: colors.border,
      textColor: colors.text,
      extendedProps: {
        category: e.category.toLowerCase(),
        mode: e.mode.toLowerCase(),
        venue: e.venue,
        status: e.status.toLowerCase(),
        invitationCount: e._count.invitations,
      },
    };
  });
};

module.exports = {
  getStudentCalendar,
  getZoneCalendar,
};


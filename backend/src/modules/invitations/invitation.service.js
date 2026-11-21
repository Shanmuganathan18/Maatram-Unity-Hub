/**
 * src/modules/invitations/invitation.service.js
 * Business logic for Event Invitations, Student Responses, and Waitlist Promotion.
 */
const prisma = require('../../config/database');
const {
  NotFoundError,
  ValidationError,
  ZoneAccessError,
  AppError,
} = require('../../utils/errors');
const { todayIST } = require('../../utils/dates');

/**
 * Get student's invitations with event details.
 */
const getMyInvitations = async (studentProfileId, query = {}) => {
  const where = { studentProfileId };

  if (query.response) {
    where.response = query.response.toUpperCase();
  }

  const invitations = await prisma.eventInvitation.findMany({
    where,
    include: {
      event: {
        include: {
          zone: { select: { name: true } },
          createdBy: { select: { name: true, designation: true } },
          questions: { orderBy: { order: 'asc' } },
        },
      },
      answers: true,
      attendance: true,
    },
    orderBy: { invitedAt: 'desc' },
  });

  return invitations.map((inv) => ({
    id: inv.id,
    eventId: inv.event.id,
    title: inv.event.title,
    category: inv.event.category.toLowerCase(),
    date: inv.event.date,
    startTime: inv.event.startTime,
    endTime: inv.event.endTime,
    mode: inv.event.mode.toLowerCase(),
    venue: inv.event.venue,
    meetingLink: inv.event.meetingLink,
    eventStatus: inv.event.status.toLowerCase(),
    responseDeadline: inv.event.responseDeadline,
    response: inv.response.toLowerCase(),
    declineReason: inv.declineReason,
    respondedAt: inv.respondedAt,
    invitedAt: inv.invitedAt,
    attendance: inv.attendance ? inv.attendance.status.toLowerCase() : null,
    questions: inv.event.questions,
    answers: inv.answers.reduce((acc, a) => {
      acc[a.questionId] = a.answer;
      return acc;
    }, {}),
  }));
};

/**
 * Student accepts invitation.
 */
const acceptInvitation = async (studentProfileId, invitationId, answers = {}) => {
  const inv = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    include: {
      event: {
        include: {
          questions: true,
          invitations: { select: { response: true } },
        },
      },
    },
  });

  if (!inv || inv.studentProfileId !== studentProfileId) {
    throw new NotFoundError('Invitation not found');
  }

  const ev = inv.event;
  if (!['INVITATIONS_OPEN', 'PUBLISHED', 'IN_PROGRESS'].includes(ev.status)) {
    throw new ValidationError('This event is no longer accepting responses');
  }

  if (ev.responseDeadline && new Date() > ev.responseDeadline) {
    throw new ValidationError('The response deadline for this event has passed');
  }

  // Validate required questions
  for (const q of ev.questions) {
    if (q.required && (!answers[q.id] || !String(answers[q.id]).trim())) {
      throw new ValidationError(`Answer required for question: "${q.label}"`);
    }
  }

  // Check capacity -> waitlist handling
  let finalStatus = 'ACCEPTED';
  if (ev.capacity) {
    const currentAccepted = ev.invitations.filter((i) => i.response === 'ACCEPTED').length;
    if (currentAccepted >= ev.capacity) {
      if (ev.waitlistEnabled) {
        finalStatus = 'WAITLISTED';
      } else {
        throw new ValidationError('Event has reached maximum capacity');
      }
    }
  }

  return prisma.$transaction(async (tx) => {
    // 1. Update invitation status
    const updated = await tx.eventInvitation.update({
      where: { id: invitationId },
      data: {
        response: finalStatus,
        respondedAt: new Date(),
        declineReason: null,
      },
    });

    // 2. Clear old answers
    await tx.eventAnswer.deleteMany({
      where: { invitationId },
    });

    // 3. Save answers
    for (const [qId, ans] of Object.entries(answers)) {
      if (ans !== undefined && ans !== null) {
        await tx.eventAnswer.create({
          data: {
            invitationId,
            questionId: qId,
            answer: String(ans),
          },
        });
      }
    }

    return updated;
  });
};

/**
 * Student declines invitation.
 */
const declineInvitation = async (studentProfileId, invitationId, declineReason = '') => {
  const inv = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });

  if (!inv || inv.studentProfileId !== studentProfileId) {
    throw new NotFoundError('Invitation not found');
  }

  if (inv.event.responseDeadline && new Date() > inv.event.responseDeadline) {
    throw new ValidationError('The response deadline for this event has passed');
  }

  return prisma.eventInvitation.update({
    where: { id: invitationId },
    data: {
      response: 'DECLINED',
      declineReason: declineReason ? declineReason.trim() : null,
      respondedAt: new Date(),
    },
  });
};

/**
 * Student withdraws response.
 */
const withdrawInvitation = async (studentProfileId, invitationId) => {
  const inv = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    include: { event: true },
  });

  if (!inv || inv.studentProfileId !== studentProfileId) {
    throw new NotFoundError('Invitation not found');
  }

  if (inv.response !== 'ACCEPTED' && inv.response !== 'WAITLISTED') {
    throw new ValidationError('Can only withdraw an accepted or waitlisted response');
  }

  return prisma.eventInvitation.update({
    where: { id: invitationId },
    data: {
      response: 'WITHDRAWN',
      respondedAt: new Date(),
    },
  });
};

/**
 * List responses for an event (Officer/Admin).
 */
const listEventResponses = async (eventId, officerZoneId = null, query = {}) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { questions: { orderBy: { order: 'asc' } } },
  });

  if (!event) throw new NotFoundError('Event not found');
  if (officerZoneId && event.zoneId !== officerZoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  const where = { eventId };
  if (query.response) {
    where.response = query.response.toUpperCase();
  }

  const invitations = await prisma.eventInvitation.findMany({
    where,
    include: {
      studentProfile: {
        include: {
          institution: { select: { id: true, name: true, code: true } },
          department: { select: { name: true } },
          user: { select: { email: true } },
        },
      },
      answers: true,
      attendance: true,
    },
    orderBy: { respondedAt: 'asc' },
  });

  return {
    event: {
      id: event.id,
      title: event.title,
      capacity: event.capacity,
      questions: event.questions,
    },
    responses: invitations.map((inv) => ({
      id: inv.id,
      studentId: inv.studentProfile.id,
      studentCode: inv.studentProfile.studentId,
      name: inv.studentProfile.name,
      email: inv.studentProfile.user.email,
      phone: inv.studentProfile.phone,
      institution: inv.studentProfile.institution.name,
      institutionCode: inv.studentProfile.institution.code,
      department: inv.studentProfile.department?.name || '—',
      year: inv.studentProfile.year,
      response: inv.response.toLowerCase(),
      declineReason: inv.declineReason,
      respondedAt: inv.respondedAt,
      invitedAt: inv.invitedAt,
      attendance: inv.attendance ? inv.attendance.status.toLowerCase() : null,
      answers: inv.answers.reduce((acc, a) => {
        acc[a.questionId] = a.answer;
        return acc;
      }, {}),
    })),
  };
};

/**
 * Promote student from waitlist to accepted (Officer).
 */
const promoteWaitlistStudent = async (eventId, invitationId, officerProfile) => {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: {
      invitations: { select: { response: true } },
    },
  });

  if (!event) throw new NotFoundError('Event not found');
  if (event.zoneId !== officerProfile.zoneId) {
    throw new ZoneAccessError('You do not have access to events from another zone');
  }

  const inv = await prisma.eventInvitation.findUnique({
    where: { id: invitationId },
    include: {
      studentProfile: {
        include: { user: { select: { id: true } } },
      },
    },
  });

  if (!inv || inv.eventId !== eventId || inv.response !== 'WAITLISTED') {
    throw new NotFoundError('Waitlisted invitation not found');
  }

  // Promote
  const updated = await prisma.eventInvitation.update({
    where: { id: invitationId },
    data: { response: 'ACCEPTED' },
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      zoneId: officerProfile.zoneId,
      actorId: officerProfile.userId,
      actorName: officerProfile.name,
      type: 'waitlist_promoted',
      description: `Promoted ${inv.studentProfile.name} from waitlist to confirmed participant`,
      related: { type: 'event', id: event.id, label: event.title },
    },
  });

  return updated;
};

module.exports = {
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  withdrawInvitation,
  listEventResponses,
  promoteWaitlistStudent,
};


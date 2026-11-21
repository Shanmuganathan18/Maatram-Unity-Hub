/**
 * src/modules/support/support.service.js
 */
const prisma = require('../../config/database');
const { NotFoundError, ValidationError, AuthorizationError } = require('../../utils/errors');
const { createNotification } = require('../../services/notificationService');

const listTickets = async (user, query = {}) => {
  const where = {};

  // Students and Officers only see tickets they submitted
  if (user.role === 'STUDENT' || user.role === 'OFFICER') {
    where.submittedById = user.id;
  } else {
    // Admin filters
    if (query.status) where.status = query.status.toUpperCase();
    if (query.priority) where.priority = query.priority.toUpperCase();
    if (query.zoneId) where.zoneId = query.zoneId;
  }

  const tickets = await prisma.supportTicket.findMany({
    where,
    include: {
      submittedBy: {
        select: {
          email: true,
          role: true,
          studentProfile: { select: { name: true } },
          officerProfile: { select: { name: true } },
        },
      },
      assignee: {
        select: {
          adminProfile: { select: { name: true } },
          email: true,
        },
      },
      _count: { select: { messages: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return tickets.map((t) => ({
    id: t.id,
    subject: t.subject,
    category: t.category,
    priority: t.priority.toLowerCase(),
    status: t.status.toLowerCase(),
    submittedBy: t.submittedBy.studentProfile?.name || t.submittedBy.officerProfile?.name || t.submittedBy.email,
    userRole: t.submittedBy.role.toLowerCase(),
    assigneeName: t.assignee?.adminProfile?.name || t.assignee?.email || 'Unassigned',
    zoneId: t.zoneId,
    messageCount: t._count.messages,
    createdAt: t.createdAt.getTime(),
    updatedAt: t.updatedAt.getTime(),
  }));
};

const getTicketById = async (id, user) => {
  const ticket = await prisma.supportTicket.findUnique({
    where: { id },
    include: {
      submittedBy: {
        select: {
          id: true,
          email: true,
          role: true,
          studentProfile: { select: { name: true } },
          officerProfile: { select: { name: true } },
        },
      },
      assignee: {
        select: {
          id: true,
          email: true,
          adminProfile: { select: { name: true } },
        },
      },
      messages: {
        orderBy: { createdAt: 'asc' },
        include: {
          author: {
            select: {
              id: true,
              role: true,
              studentProfile: { select: { name: true } },
              officerProfile: { select: { name: true } },
              adminProfile: { select: { name: true } },
            },
          },
        },
      },
      statusHistory: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  if (!ticket) throw new NotFoundError('Ticket not found');

  // Permissions check
  if ((user.role === 'STUDENT' || user.role === 'OFFICER') && ticket.submittedById !== user.id) {
    throw new AuthorizationError('You do not have access to this support ticket');
  }

  // Non-admins must not see internal notes
  const isStaff = ['ADMIN', 'SUPER_ADMIN'].includes(user.role);
  const visibleMessages = ticket.messages.filter((m) => isStaff || !m.internal);

  return {
    id: ticket.id,
    subject: ticket.subject,
    category: ticket.category,
    priority: ticket.priority.toLowerCase(),
    status: ticket.status.toLowerCase(),
    submittedBy: {
      id: ticket.submittedBy.id,
      name: ticket.submittedBy.studentProfile?.name || ticket.submittedBy.officerProfile?.name || ticket.submittedBy.email,
      role: ticket.submittedBy.role.toLowerCase(),
    },
    assignee: ticket.assignee ? {
      id: ticket.assignee.id,
      name: ticket.assignee.adminProfile?.name || ticket.assignee.email,
    } : null,
    zoneId: ticket.zoneId,
    createdAt: ticket.createdAt.getTime(),
    messages: visibleMessages.map((m) => ({
      id: m.id,
      text: m.text,
      internal: m.internal,
      authorName: m.author.adminProfile?.name || m.author.officerProfile?.name || m.author.studentProfile?.name || 'Staff',
      authorRole: m.author.role.toLowerCase(),
      createdAt: m.createdAt.getTime(),
    })),
    history: ticket.statusHistory.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus?.toLowerCase(),
      toStatus: h.toStatus.toLowerCase(),
      actorName: h.actorName,
      note: h.note,
      createdAt: h.createdAt.getTime(),
    })),
  };
};

const createTicket = async (data, user) => {
  const zoneId = user.studentProfile?.zoneId || user.officerProfile?.zoneId || null;

  return prisma.supportTicket.create({
    data: {
      submittedById: user.id,
      subject: data.subject.trim(),
      category: data.category || 'General',
      priority: data.priority ? data.priority.toUpperCase() : 'MEDIUM',
      status: 'OPEN',
      zoneId,
      messages: {
        create: {
          authorId: user.id,
          text: data.message.trim(),
          internal: false,
        },
      },
      statusHistory: {
        create: {
          toStatus: 'OPEN',
          actorId: user.id,
          actorName: user.studentProfile?.name || user.officerProfile?.name || user.email,
          note: 'Ticket created',
        },
      },
    },
  });
};

const addMessage = async (ticketId, text, internal = false, user) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket not found');

  if ((user.role === 'STUDENT' || user.role === 'OFFICER') && ticket.submittedById !== user.id) {
    throw new AuthorizationError('You do not have access to this ticket');
  }

  // Non-staff cannot post internal notes
  const isInternal = ['ADMIN', 'SUPER_ADMIN'].includes(user.role) ? Boolean(internal) : false;

  const msg = await prisma.supportMessage.create({
    data: {
      ticketId,
      authorId: user.id,
      text: text.trim(),
      internal: isInternal,
    },
  });

  // If staff replied to student/officer ticket, notify the submitter
  if (['ADMIN', 'SUPER_ADMIN'].includes(user.role) && !isInternal && ticket.submittedById !== user.id) {
    await createNotification({
      userId: ticket.submittedById,
      category: 'support_update',
      title: `Update on ticket: ${ticket.subject}`,
      body: `Staff responded: "${text.slice(0, 80)}${text.length > 80 ? '...' : ''}"`,
      link: { type: 'ticket', ticketId: ticket.id },
    });
  }

  return msg;
};

const updateTicketStatus = async (ticketId, status, actor, note = '') => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket not found');

  const newStatus = status.toUpperCase();

  const updated = await prisma.$transaction(async (tx) => {
    const t = await tx.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: newStatus,
        resolvedAt: ['RESOLVED', 'CLOSED'].includes(newStatus) ? new Date() : null,
      },
    });

    await tx.supportStatusHistory.create({
      data: {
        ticketId,
        fromStatus: ticket.status,
        toStatus: newStatus,
        actorId: actor.id,
        actorName: actor.name || actor.email,
        note: note || `Status set to ${newStatus}`,
      },
    });

    return t;
  });

  return updated;
};

const assignTicket = async (ticketId, assigneeId, actor) => {
  const ticket = await prisma.supportTicket.findUnique({ where: { id: ticketId } });
  if (!ticket) throw new NotFoundError('Ticket not found');

  return prisma.supportTicket.update({
    where: { id: ticketId },
    data: { assigneeId },
  });
};

module.exports = {
  listTickets,
  getTicketById,
  createTicket,
  addMessage,
  updateTicketStatus,
  assignTicket,
};

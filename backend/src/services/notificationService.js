/**
 * src/services/notificationService.js
 * Centralized notification engine:
 * - Persists notifications to DB
 * - Dispatches across configured channels (In-app, Email, SMS, WhatsApp)
 * - Manages active SSE connections for real-time delivery
 */
const prisma = require('../config/database');
const logger = require('../utils/logger');
const emailService = require('./emailService');

// Map of active SSE client responses: userId -> Set of res objects
const sseClients = new Map();

/**
 * Register an SSE client for real-time events.
 */
const registerClient = (userId, res) => {
  if (!sseClients.has(userId)) {
    sseClients.set(userId, new Set());
  }
  sseClients.get(userId).add(res);

  res.on('close', () => {
    const clients = sseClients.get(userId);
    if (clients) {
      clients.delete(res);
      if (clients.size === 0) {
        sseClients.delete(userId);
      }
    }
  });
};

/**
 * Push an SSE event to a specific user if connected.
 */
const pushSSE = (userId, eventType, data) => {
  const clients = sseClients.get(userId);
  if (!clients || clients.size === 0) return;

  const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const client of clients) {
    client.write(payload);
  }
};

/**
 * Broadcast SSE event to all connected users with a given role.
 */
const broadcastSSE = async (role, eventType, data) => {
  // Find all user IDs with this role
  const users = await prisma.user.findMany({
    where: { role },
    select: { id: true },
  });

  users.forEach((u) => pushSSE(u.id, eventType, data));
};

/**
 * Create and dispatch a notification.
 * @param {Object} params
 * @param {string} params.userId - Recipient user ID
 * @param {string} params.category - Category key e.g. 'event_invitation', 'availability_reminder'
 * @param {string} params.title - Title
 * @param {string} params.body - Notification body
 * @param {Object} [params.link] - Structured link { type: 'event', eventId: '...' }
 * @param {string} [params.idempotencyKey] - Unique key to prevent duplicates
 * @param {Object} [params.emailData] - Optional direct email metadata or templates
 */
const createNotification = async ({
  userId,
  category,
  title,
  body,
  link = null,
  idempotencyKey = null,
  emailData = null,
}) => {
  try {
    // Check for idempotency
    if (idempotencyKey) {
      const existing = await prisma.notification.findUnique({
        where: { idempotencyKey },
      });
      if (existing) {
        logger.debug(`Notification with idempotency key ${idempotencyKey} already exists. Skipping.`);
        return existing;
      }
    }

    // Load user and preferences
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        studentProfile: { select: { name: true, phone: true } },
        officerProfile: { select: { name: true, phone: true } },
        adminProfile: { select: { name: true, phone: true } },
        notificationPrefs: {
          where: { category },
        },
      },
    });

    if (!user) {
      logger.warn(`Cannot create notification: User ${userId} not found`);
      return null;
    }

    const pref = user.notificationPrefs[0] || {
      inApp: true,
      email: true,
      sms: false,
      whatsapp: false,
    };

    // 1. Create DB notification
    const notification = await prisma.notification.create({
      data: {
        userId,
        category,
        title,
        body,
        link: link ? link : undefined,
        idempotencyKey,
        read: false,
      },
    });

    // 2. Track In-App delivery
    if (pref.inApp) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'IN_APP',
          status: 'DELIVERED',
          deliveredAt: new Date(),
        },
      });

      // Push real-time SSE event
      pushSSE(userId, 'notification', {
        id: notification.id,
        category,
        title,
        body,
        link,
        createdAt: notification.createdAt,
      });
    }

    // 3. Track Email delivery
    if (pref.email && user.email) {
      const recipientName =
        user.studentProfile?.name ||
        user.officerProfile?.name ||
        user.adminProfile?.name ||
        'User';

      let emailResult;
      if (emailData && emailData.html) {
        emailResult = await emailService.sendEmail({
          to: user.email,
          subject: emailData.subject || title,
          html: emailData.html,
        });
      } else {
        emailResult = await emailService.sendEmail({
          to: user.email,
          subject: `[Maatram] ${title}`,
          html: `<p>Dear <strong>${recipientName}</strong>,</p><p>${body}</p><p>Maatram Foundation</p>`,
        });
      }

      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'EMAIL',
          status: emailResult.status,
          providerRef: emailResult.providerRef,
          errorReason: emailResult.errorReason,
          sentAt: emailResult.status === 'DELIVERED' ? new Date() : null,
          deliveredAt: emailResult.status === 'DELIVERED' ? new Date() : null,
        },
      });
    }

    // 4. SMS / WhatsApp (record SKIPPED unless provider configured)
    if (pref.sms) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'SMS',
          status: 'SKIPPED',
          errorReason: 'SMS provider not configured',
        },
      });
    }

    if (pref.whatsapp) {
      await prisma.notificationDelivery.create({
        data: {
          notificationId: notification.id,
          channel: 'WHATSAPP',
          status: 'SKIPPED',
          errorReason: 'WhatsApp provider not configured',
        },
      });
    }

    return notification;
  } catch (error) {
    logger.error('Error in createNotification:', error);
    throw error;
  }
};

module.exports = {
  createNotification,
  registerClient,
  pushSSE,
  broadcastSSE,
};


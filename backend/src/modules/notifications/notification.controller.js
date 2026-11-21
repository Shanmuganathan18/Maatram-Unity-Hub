/**
 * src/modules/notifications/notification.controller.js
 */
const prisma = require('../../config/database');
const notificationService = require('../../services/notificationService');
const { success } = require('../../utils/response');
const { NotFoundError } = require('../../utils/errors');

const listNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const unreadCount = await prisma.notification.count({
      where: { userId, read: false },
    });

    const items = notifications.map((n) => ({
      id: n.id,
      category: n.category,
      title: n.title,
      body: n.body,
      read: n.read,
      link: n.link,
      createdAt: n.createdAt.getTime(),
    }));

    return success(res, { items, unreadCount }, 'Notifications retrieved');
  } catch (err) {
    next(err);
  }
};

const markRead = async (req, res, next) => {
  try {
    const notif = await prisma.notification.findUnique({
      where: { id: req.params.id },
    });

    if (!notif || notif.userId !== req.user.id) {
      throw new NotFoundError('Notification not found');
    }

    const updated = await prisma.notification.update({
      where: { id: req.params.id },
      data: { read: true, readAt: new Date() },
    });

    return success(res, updated, 'Notification marked as read');
  } catch (err) {
    next(err);
  }
};

const markAllRead = async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { userId: req.user.id, read: false },
      data: { read: true, readAt: new Date() },
    });
    return success(res, null, 'All notifications marked as read');
  } catch (err) {
    next(err);
  }
};

const getPreferences = async (req, res, next) => {
  try {
    const prefs = await prisma.notificationPreference.findMany({
      where: { userId: req.user.id },
    });

    const prefMap = {};
    prefs.forEach((p) => {
      prefMap[p.category] = {
        inApp: p.inApp,
        email: p.email,
        sms: p.sms,
        whatsapp: p.whatsapp,
      };
    });

    return success(res, prefMap, 'Preferences retrieved');
  } catch (err) {
    next(err);
  }
};

const savePreferences = async (req, res, next) => {
  try {
    const prefs = req.body; // map of category -> { inApp, email, sms, whatsapp }
    for (const [category, channels] of Object.entries(prefs)) {
      await prisma.notificationPreference.upsert({
        where: {
          userId_category: {
            userId: req.user.id,
            category,
          },
        },
        update: {
          inApp: channels.inApp !== undefined ? channels.inApp : true,
          email: channels.email !== undefined ? channels.email : true,
          sms: channels.sms !== undefined ? channels.sms : false,
          whatsapp: channels.whatsapp !== undefined ? channels.whatsapp : false,
        },
        create: {
          userId: req.user.id,
          category,
          inApp: channels.inApp !== undefined ? channels.inApp : true,
          email: channels.email !== undefined ? channels.email : true,
          sms: channels.sms !== undefined ? channels.sms : false,
          whatsapp: channels.whatsapp !== undefined ? channels.whatsapp : false,
        },
      });
    }

    return success(res, null, 'Preferences updated');
  } catch (err) {
    next(err);
  }
};

/**
 * SSE real-time stream endpoint.
 */
const sseStream = async (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });

  res.write(': connected\n\n');

  notificationService.registerClient(req.user.id, res);

  // Send initial ping to keep connection alive
  const pingInterval = setInterval(() => {
    res.write(': ping\n\n');
  }, 25000);

  res.on('close', () => {
    clearInterval(pingInterval);
  });
};

module.exports = {
  listNotifications,
  markRead,
  markAllRead,
  getPreferences,
  savePreferences,
  sseStream,
};


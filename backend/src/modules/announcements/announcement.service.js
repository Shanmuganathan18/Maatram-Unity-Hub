/**
 * src/modules/announcements/announcement.service.js
 */
const prisma = require('../../config/database');
const { NotFoundError, ValidationError } = require('../../utils/errors');
const { createNotification } = require('../../services/notificationService');

const listAnnouncements = async (query = {}, user = null) => {
  const where = {};

  // For non-admin, only show published announcements
  if (!user || user.role === 'STUDENT' || user.role === 'OFFICER') {
    where.status = 'PUBLISHED';
  } else if (query.status) {
    where.status = query.status.toUpperCase();
  }

  const announcements = await prisma.announcement.findMany({
    where,
    include: {
      createdBy: {
        select: {
          adminProfile: { select: { name: true } },
          email: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return announcements.map((a) => ({
    id: a.id,
    title: a.title,
    body: a.body,
    audience: a.audience.toLowerCase(),
    targetZoneIds: a.targetZoneIds,
    targetInstIds: a.targetInstIds,
    status: a.status.toLowerCase(),
    publishAt: a.publishAt ? a.publishAt.getTime() : null,
    expiresAt: a.expiresAt ? a.expiresAt.getTime() : null,
    createdBy: a.createdBy.adminProfile?.name || a.createdBy.email,
    createdAt: a.createdAt.getTime(),
  }));
};

const createAnnouncement = async (data, actor) => {
  const audience = data.audience.toUpperCase();
  const status = data.publishImmediately ? 'PUBLISHED' : (data.status ? data.status.toUpperCase() : 'DRAFT');

  const announcement = await prisma.announcement.create({
    data: {
      title: data.title.trim(),
      body: data.body.trim(),
      audience,
      targetZoneIds: data.targetZoneIds || [],
      targetInstIds: data.targetInstIds || [],
      status,
      publishAt: status === 'PUBLISHED' ? new Date() : (data.publishAt ? new Date(data.publishAt) : null),
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      createdById: actor.id,
    },
  });

  // If published immediately, dispatch notifications to target users
  if (status === 'PUBLISHED') {
    await dispatchAnnouncementNotifications(announcement);
  }

  return announcement;
};

const publishAnnouncement = async (id, actor) => {
  const a = await prisma.announcement.findUnique({ where: { id } });
  if (!a) throw new NotFoundError('Announcement not found');

  const updated = await prisma.announcement.update({
    where: { id },
    data: {
      status: 'PUBLISHED',
      publishAt: new Date(),
    },
  });

  await dispatchAnnouncementNotifications(updated);
  return updated;
};

const dispatchAnnouncementNotifications = async (announcement) => {
  const userWhere = { status: 'ACTIVE' };

  if (announcement.audience === 'ALL_STUDENTS') {
    userWhere.role = 'STUDENT';
  } else if (announcement.audience === 'ALL_OFFICERS') {
    userWhere.role = 'OFFICER';
  } else if (announcement.audience === 'SELECTED_ZONES') {
    const zones = announcement.targetZoneIds;
    userWhere.OR = [
      { studentProfile: { zoneId: { in: zones } } },
      { officerProfile: { zoneId: { in: zones } } },
    ];
  }

  const targetUsers = await prisma.user.findMany({
    where: userWhere,
    select: { id: true },
    take: 500, // Batch limit
  });

  for (const u of targetUsers) {
    await createNotification({
      userId: u.id,
      category: 'announcement',
      title: announcement.title,
      body: announcement.body,
      idempotencyKey: `ann-${announcement.id}-${u.id}`,
    });
  }
};

module.exports = {
  listAnnouncements,
  createAnnouncement,
  publishAnnouncement,
};

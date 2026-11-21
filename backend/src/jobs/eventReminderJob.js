/**
 * src/jobs/eventReminderJob.js
 * Sends reminders to students with accepted or pending invitations for events happening in the next 24 hours.
 */
const prisma = require('../config/database');
const { todayIST, addDays } = require('../utils/dates');
const { createNotification } = require('../services/notificationService');
const logger = require('../utils/logger');

const runEventReminderJob = async () => {
  try {
    const today = todayIST();
    const tomorrow = addDays(today, 1);

    // Find upcoming events tomorrow
    const upcomingEvents = await prisma.event.findMany({
      where: {
        date: { in: [today, tomorrow] },
        status: { in: ['INVITATIONS_OPEN', 'PUBLISHED', 'IN_PROGRESS'] },
      },
      include: {
        invitations: {
          where: { response: 'ACCEPTED' },
          include: {
            studentProfile: {
              include: { user: { select: { id: true, email: true } } },
            },
          },
        },
      },
    });

    for (const ev of upcomingEvents) {
      for (const inv of ev.invitations) {
        const student = inv.studentProfile;
        const idempotencyKey = `event-remind-${ev.id}-${student.id}-${ev.date}`;

        await createNotification({
          userId: student.user.id,
          category: 'event_reminder',
          title: `Reminder: ${ev.title} (${ev.date})`,
          body: `You are confirmed for ${ev.title} on ${ev.date}${ev.startTime ? ' at ' + ev.startTime : ''}. ${ev.venue ? 'Venue: ' + ev.venue : ''}`,
          link: { type: 'event', eventId: ev.id },
          idempotencyKey,
        });
      }
    }
  } catch (err) {
    logger.error('Error running event reminder job:', err);
  }
};

module.exports = { runEventReminderJob };


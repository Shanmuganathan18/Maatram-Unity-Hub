/**
 * src/jobs/availabilityReminderJob.js
 * Runs weekly or on schedule to remind students whose availability for the current week is missing or draft.
 */
const prisma = require('../config/database');
const { todayIST, weekStartOf, deadlineFor } = require('../utils/dates');
const { createNotification } = require('../services/notificationService');
const { sendAvailabilityReminderEmail } = require('../services/emailService');
const logger = require('../utils/logger');

const runAvailabilityReminderJob = async () => {
  try {
    const today = todayIST();
    const currentWeekStart = weekStartOf(today);
    const deadline = deadlineFor(currentWeekStart);

    // Only run if before deadline
    if (new Date() >= deadline) {
      logger.info('Availability reminder job: deadline has already passed for this week.');
      return;
    }

    // Find all active students
    const activeStudents = await prisma.studentProfile.findMany({
      where: {
        status: 'ACTIVE',
        user: { status: 'ACTIVE' },
      },
      include: {
        user: { select: { id: true, email: true } },
      },
    });

    // Check which ones have NOT submitted for current week
    const submissions = await prisma.availabilitySubmission.findMany({
      where: {
        weekStart: currentWeekStart,
        status: 'SUBMITTED',
      },
      select: { studentProfileId: true },
    });

    const submittedIds = new Set(submissions.map((s) => s.studentProfileId));
    const pendingStudents = activeStudents.filter((s) => !submittedIds.has(s.id));

    logger.info(`Availability reminder job: Found ${pendingStudents.length} students pending submission.`);

    for (const student of pendingStudents) {
      const idempotencyKey = `avail-remind-${currentWeekStart}-${student.id}`;
      await createNotification({
        userId: student.user.id,
        category: 'availability_reminder',
        title: 'Reminder: submit your weekly availability',
        body: `Your availability for week starting ${currentWeekStart} has not been submitted yet. Deadline: Friday 6:00 PM IST.`,
        link: { type: 'week', weekStart: currentWeekStart },
        idempotencyKey,
      });

      if (student.user.email) {
        await sendAvailabilityReminderEmail(
          student.user.email,
          student.name,
          currentWeekStart,
          deadline,
        );
      }
    }
  } catch (err) {
    logger.error('Error running availability reminder job:', err);
  }
};

module.exports = { runAvailabilityReminderJob };


/**
 * src/jobs/deadlineJob.js
 * Runs after Friday 18:00 IST to lock current week submissions
 * and mark unsubmitted weeks as locked.
 */
const prisma = require('../config/database');
const { todayIST, weekStartOf, deadlineFor } = require('../utils/dates');
const logger = require('../utils/logger');

const runDeadlineJob = async () => {
  try {
    const today = todayIST();
    const currentWeekStart = weekStartOf(today);
    const deadline = deadlineFor(currentWeekStart);

    if (new Date() < deadline) {
      return; // Deadline not yet passed
    }

    // Lock all unlocked submissions for the passed deadline week
    const result = await prisma.availabilitySubmission.updateMany({
      where: {
        weekStart: currentWeekStart,
        locked: false,
      },
      data: {
        locked: true,
      },
    });

    if (result.count > 0) {
      logger.info(`Deadline job: Locked ${result.count} submissions for week ${currentWeekStart}.`);
    }
  } catch (err) {
    logger.error('Error running deadline job:', err);
  }
};

module.exports = { runDeadlineJob };


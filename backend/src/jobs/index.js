/**
 * src/jobs/index.js
 * Central scheduler for recurring tasks using node-cron.
 */
const cron = require('node-cron');
const logger = require('../utils/logger');
const { runAvailabilityReminderJob } = require('./availabilityReminderJob');
const { runDeadlineJob } = require('./deadlineJob');
const { runEventReminderJob } = require('./eventReminderJob');
const { runNotificationRetryJob } = require('./notificationRetryJob');
const { startWorker: startEmailQueueWorker, stopWorker: stopEmailQueueWorker } = require('./emailQueueWorker');

const startJobs = () => {
  logger.info('Initializing background jobs...');

  // 0. Durable Email Queue Worker: Runs continuous polling with concurrency & crash recovery
  startEmailQueueWorker(4000);

  // 1. Availability Reminder: Runs every Wednesday and Friday at 10:00 AM IST
  cron.schedule(
    '0 10 * * 3,5',
    async () => {
      logger.info('Triggering availability reminder job...');
      await runAvailabilityReminderJob();
    },
    { timezone: 'Asia/Kolkata' },
  );

  // 2. Submission Deadline Locker: Runs every Friday at 18:05 IST
  cron.schedule(
    '5 18 * * 5',
    async () => {
      logger.info('Triggering submission deadline locker...');
      await runDeadlineJob();
    },
    { timezone: 'Asia/Kolkata' },
  );

  // 3. Daily Event Reminders: Runs every day at 07:00 AM IST
  cron.schedule(
    '0 7 * * *',
    async () => {
      logger.info('Triggering daily event reminder job...');
      await runEventReminderJob();
    },
    { timezone: 'Asia/Kolkata' },
  );

  // 4. Notification Retry: Runs every 15 minutes
  cron.schedule('*/15 * * * *', async () => {
    await runNotificationRetryJob();
  });

  logger.info('✅ Background jobs scheduled successfully (Asia/Kolkata timezone)');
};

module.exports = {
  startJobs,
  stopEmailQueueWorker,
  startEmailQueueWorker,
  runAvailabilityReminderJob,
  runDeadlineJob,
  runEventReminderJob,
  runNotificationRetryJob,
};

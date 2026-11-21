/**
 * src/jobs/notificationRetryJob.js
 * Retries failed email notification deliveries (up to 3 attempts).
 */
const prisma = require('../config/database');
const emailService = require('../services/emailService');
const logger = require('../utils/logger');

const runNotificationRetryJob = async () => {
  try {
    const failedDeliveries = await prisma.notificationDelivery.findMany({
      where: {
        status: 'FAILED',
        channel: 'EMAIL',
        attempts: { lt: 3 },
      },
      include: {
        notification: {
          include: {
            user: { select: { email: true } },
          },
        },
      },
      take: 20,
    });

    for (const delivery of failedDeliveries) {
      const email = delivery.notification.user.email;
      if (!email) continue;

      const result = await emailService.sendEmail({
        to: email,
        subject: delivery.notification.title,
        html: `<p>${delivery.notification.body}</p>`,
      });

      await prisma.notificationDelivery.update({
        where: { id: delivery.id },
        data: {
          attempts: delivery.attempts + 1,
          status: result.status,
          providerRef: result.providerRef,
          errorReason: result.errorReason,
          deliveredAt: result.status === 'DELIVERED' ? new Date() : null,
        },
      });
    }
  } catch (err) {
    logger.error('Error running notification retry job:', err);
  }
};

module.exports = { runNotificationRetryJob };


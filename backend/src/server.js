/**
 * src/server.js
 * HTTP server bootstrap.
 * Connects to the database, starts background jobs, then starts listening.
 */
const env = require('./config/env');
const logger = require('./utils/logger');
const app = require('./app');
const prisma = require('./config/database');
const { startJobs, stopEmailQueueWorker } = require('./jobs');

const PORT = env.port;

async function main() {
  // ── Verify database connection ─────────────────────────────────────────────
  try {
    await prisma.$connect();
    logger.info('✅ Database connected');
  } catch (err) {
    logger.error('❌ Database connection failed:', err.message);
    logger.error('👉 Check DATABASE_URL in your .env file and ensure MySQL is running.');
    process.exit(1);
  }

  // ── Verify SMTP Email Connection ──────────────────────────────────────────
  if (!env.isTest) {
    try {
      const emailService = require('./services/emailService');
      const emailStatus = await emailService.verifyConnection();
      if (!emailStatus.connected) {
        logger.warn('⚠️  ' + emailStatus.message);
      }
    } catch (err) {
      logger.warn('⚠️  Email service initialization error:', err.message);
    }
  }

  // ── Start background jobs (only in non-test environments) ─────────────────
  if (!env.isTest) {
    startJobs();
    logger.info('✅ Background jobs scheduled');
  }

  // ── Start HTTP server ──────────────────────────────────────────────────────
  const server = app.listen(PORT, () => {
    logger.info(`\n🚀 Maatram API running on http://localhost:${PORT}`);
    logger.info(`   Environment : ${env.nodeEnv}`);
    logger.info(`   Health      : http://localhost:${PORT}/health`);
    logger.info(`   API base    : http://localhost:${PORT}/api/v1`);
    logger.info(`   Allowed origins: ${env.cors.allowedOrigins.join(', ')}`);
    if (!env.email.enabled) logger.warn('⚠️  Email delivery is DISABLED (no SMTP credentials configured)');
    if (!env.sms.enabled) logger.warn('⚠️  SMS/WhatsApp delivery is DISABLED (no provider configured)');
  });

  // ── Graceful shutdown ──────────────────────────────────────────────────────
  const shutdown = async (signal) => {
    logger.info(`\n${signal} received — shutting down gracefully...`);
    stopEmailQueueWorker();
    server.close(async () => {
      await prisma.$disconnect();
      logger.info('Database disconnected. Goodbye.');
      process.exit(0);
    });
    // Force exit after 10 seconds
    setTimeout(() => process.exit(1), 10000);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  // ── Unhandled rejection guard ──────────────────────────────────────────────
  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection:', reason);
  });
}

main();


/**
 * src/modules/notifications/notification.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount } = require('../../middleware/authorize');
const notificationController = require('./notification.controller');

const router = Router();

// Stream must authenticate via query token or header
router.get('/stream', authenticate, notificationController.sseStream);

router.get('/', authenticate, requireActiveAccount, notificationController.listNotifications);
router.patch('/:id/read', authenticate, requireActiveAccount, notificationController.markRead);
router.post('/mark-all-read', authenticate, requireActiveAccount, notificationController.markAllRead);

router.get('/preferences', authenticate, requireActiveAccount, notificationController.getPreferences);
router.put('/preferences', authenticate, requireActiveAccount, notificationController.savePreferences);

module.exports = router;

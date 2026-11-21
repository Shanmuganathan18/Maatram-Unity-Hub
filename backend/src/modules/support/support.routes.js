/**
 * src/modules/support/support.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const supportController = require('./support.controller');

const router = Router();

router.get('/', authenticate, requireActiveAccount, supportController.listTickets);
router.get('/:id', authenticate, requireActiveAccount, supportController.getTicketById);

router.post(
  '/',
  authenticate,
  requireActiveAccount,
  [
    body('subject').trim().notEmpty().withMessage('Subject is required'),
    body('message').trim().notEmpty().withMessage('Message is required'),
  ],
  validateRequest,
  supportController.createTicket,
);

router.post(
  '/:id/messages',
  authenticate,
  requireActiveAccount,
  [body('text').trim().notEmpty().withMessage('Message text is required')],
  validateRequest,
  supportController.addMessage,
);

router.patch(
  '/:id/status',
  authenticate,
  requireActiveAccount,
  requirePermission('support.manage'),
  [body('status').notEmpty().withMessage('Status is required')],
  validateRequest,
  supportController.updateStatus,
);

router.patch(
  '/:id/assign',
  authenticate,
  requireActiveAccount,
  requirePermission('support.manage'),
  [body('assigneeId').notEmpty().withMessage('Assignee ID is required')],
  validateRequest,
  supportController.assignTicket,
);

module.exports = router;

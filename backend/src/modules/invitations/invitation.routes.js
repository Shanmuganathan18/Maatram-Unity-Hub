/**
 * src/modules/invitations/invitation.routes.js
 */
const { Router } = require('express');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requireRole, requireZoneAccess } = require('../../middleware/authorize');
const invitationController = require('./invitation.controller');

const router = Router();

// Student routes
router.get(
  '/my',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  invitationController.getMyInvitations,
);

router.post(
  '/:id/accept',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  invitationController.acceptInvitation,
);

router.post(
  '/:id/decline',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  invitationController.declineInvitation,
);

router.post(
  '/:id/withdraw',
  authenticate,
  requireActiveAccount,
  requireRole('STUDENT'),
  invitationController.withdrawInvitation,
);

// Event responses list & waitlist promotion
router.get(
  '/events/:eventId',
  authenticate,
  requireActiveAccount,
  invitationController.listEventResponses,
);

router.post(
  '/events/:eventId/invitations/:id/promote',
  authenticate,
  requireActiveAccount,
  requireRole('OFFICER'),
  requireZoneAccess,
  invitationController.promoteWaitlistStudent,
);

module.exports = router;

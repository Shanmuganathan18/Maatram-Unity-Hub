/**
 * src/modules/announcements/announcement.routes.js
 */
const { Router } = require('express');
const { body } = require('express-validator');
const { authenticate } = require('../../middleware/authenticate');
const { requireActiveAccount, requirePermission } = require('../../middleware/authorize');
const validateRequest = require('../../middleware/validateRequest');
const announcementController = require('./announcement.controller');

const router = Router();

router.get('/', authenticate, requireActiveAccount, announcementController.listAnnouncements);

router.post(
  '/',
  authenticate,
  requireActiveAccount,
  requirePermission('announcements.manage'),
  [
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('body').trim().notEmpty().withMessage('Announcement body is required'),
    body('audience').notEmpty().withMessage('Target audience is required'),
  ],
  validateRequest,
  announcementController.createAnnouncement,
);

router.post(
  '/:id/publish',
  authenticate,
  requireActiveAccount,
  requirePermission('announcements.manage'),
  announcementController.publishAnnouncement,
);

module.exports = router;

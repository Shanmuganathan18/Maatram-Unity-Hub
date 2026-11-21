/**
 * src/modules/announcements/announcement.controller.js
 */
const announcementService = require('./announcement.service');
const { success, created } = require('../../utils/response');

const listAnnouncements = async (req, res, next) => {
  try {
    const items = await announcementService.listAnnouncements(req.query, req.user);
    return success(res, items, 'Announcements retrieved');
  } catch (err) {
    next(err);
  }
};

const createAnnouncement = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const createdItem = await announcementService.createAnnouncement(req.body, actor);
    return created(res, createdItem, 'Announcement created');
  } catch (err) {
    next(err);
  }
};

const publishAnnouncement = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const updated = await announcementService.publishAnnouncement(req.params.id, actor);
    return success(res, updated, 'Announcement published successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listAnnouncements,
  createAnnouncement,
  publishAnnouncement,
};


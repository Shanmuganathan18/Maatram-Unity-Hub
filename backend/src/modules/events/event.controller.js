/**
 * src/modules/events/event.controller.js
 */
const eventService = require('./event.service');
const { success, created } = require('../../utils/response');

const listEvents = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const events = await eventService.listEvents(req.query, officerZoneId);
    return success(res, events, 'Events retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const getEventById = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const event = await eventService.getEventById(req.params.id, officerZoneId);
    return success(res, event, 'Event retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const createEvent = async (req, res, next) => {
  try {
    const event = await eventService.createEvent(req.user.officerProfile, req.body);
    return created(res, event, 'Event created as draft');
  } catch (err) {
    next(err);
  }
};

const publishEvent = async (req, res, next) => {
  try {
    const result = await eventService.changeEventStatus(
      req.user.officerProfile,
      req.params.id,
      'INVITATIONS_OPEN',
      req.body,
    );
    return success(res, result, `Event published! ${result.invitedCount} students invited.`);
  } catch (err) {
    next(err);
  }
};

const postponeEvent = async (req, res, next) => {
  try {
    const result = await eventService.changeEventStatus(
      req.user.officerProfile,
      req.params.id,
      'POSTPONED',
      req.body,
    );
    return success(res, result, 'Event postponed');
  } catch (err) {
    next(err);
  }
};

const cancelEvent = async (req, res, next) => {
  try {
    const result = await eventService.changeEventStatus(
      req.user.officerProfile,
      req.params.id,
      'CANCELLED',
      req.body,
    );
    return success(res, result, 'Event cancelled');
  } catch (err) {
    next(err);
  }
};

const batchCreateEvents = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name || req.user.officerProfile?.name,
      email: req.user.email,
      role: req.user.role,
    };
    const items = Array.isArray(req.body) ? req.body : (req.body.items || []);
    const result = await eventService.batchCreateEvents(items, actor);
    return success(res, result, `Batch imported ${result.created} events`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  publishEvent,
  postponeEvent,
  cancelEvent,
  batchCreateEvents,
};


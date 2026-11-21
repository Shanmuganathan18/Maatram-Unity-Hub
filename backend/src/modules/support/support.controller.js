/**
 * src/modules/support/support.controller.js
 */
const supportService = require('./support.service');
const { success, created } = require('../../utils/response');

const listTickets = async (req, res, next) => {
  try {
    const items = await supportService.listTickets(req.user, req.query);
    return success(res, items, 'Support tickets retrieved');
  } catch (err) {
    next(err);
  }
};

const getTicketById = async (req, res, next) => {
  try {
    const ticket = await supportService.getTicketById(req.params.id, req.user);
    return success(res, ticket, 'Ticket details retrieved');
  } catch (err) {
    next(err);
  }
};

const createTicket = async (req, res, next) => {
  try {
    const ticket = await supportService.createTicket(req.body, req.user);
    return created(res, ticket, 'Support ticket created successfully');
  } catch (err) {
    next(err);
  }
};

const addMessage = async (req, res, next) => {
  try {
    const msg = await supportService.addMessage(
      req.params.id,
      req.body.text,
      req.body.internal,
      req.user,
    );
    return created(res, msg, 'Reply added');
  } catch (err) {
    next(err);
  }
};

const updateStatus = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name || req.user.email,
      email: req.user.email,
    };
    const updated = await supportService.updateTicketStatus(
      req.params.id,
      req.body.status,
      actor,
      req.body.note,
    );
    return success(res, updated, 'Ticket status updated');
  } catch (err) {
    next(err);
  }
};

const assignTicket = async (req, res, next) => {
  try {
    const actor = {
      id: req.user.id,
      name: req.user.adminProfile?.name || req.user.email,
      email: req.user.email,
    };
    const updated = await supportService.assignTicket(
      req.params.id,
      req.body.assigneeId,
      actor,
    );
    return success(res, updated, 'Ticket assigned');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  listTickets,
  getTicketById,
  createTicket,
  addMessage,
  updateStatus,
  assignTicket,
};


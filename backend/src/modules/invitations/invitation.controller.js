/**
 * src/modules/invitations/invitation.controller.js
 */
const invitationService = require('./invitation.service');
const { success } = require('../../utils/response');

const getMyInvitations = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const items = await invitationService.getMyInvitations(studentProfileId, req.query);
    return success(res, items, 'Invitations retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const acceptInvitation = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const updated = await invitationService.acceptInvitation(
      studentProfileId,
      req.params.id,
      req.body.answers || {},
    );
    return success(res, updated, 'Invitation accepted');
  } catch (err) {
    next(err);
  }
};

const declineInvitation = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const updated = await invitationService.declineInvitation(
      studentProfileId,
      req.params.id,
      req.body.declineReason,
    );
    return success(res, updated, 'Invitation declined');
  } catch (err) {
    next(err);
  }
};

const withdrawInvitation = async (req, res, next) => {
  try {
    const studentProfileId = req.user.studentProfile.id;
    const updated = await invitationService.withdrawInvitation(studentProfileId, req.params.id);
    return success(res, updated, 'Response withdrawn');
  } catch (err) {
    next(err);
  }
};

const listEventResponses = async (req, res, next) => {
  try {
    const officerZoneId = req.user.role === 'OFFICER' ? req.user.officerProfile?.zoneId : null;
    const result = await invitationService.listEventResponses(
      req.params.eventId,
      officerZoneId,
      req.query,
    );
    return success(res, result, 'Event responses retrieved successfully');
  } catch (err) {
    next(err);
  }
};

const promoteWaitlistStudent = async (req, res, next) => {
  try {
    const updated = await invitationService.promoteWaitlistStudent(
      req.params.eventId,
      req.params.id,
      req.user.officerProfile,
    );
    return success(res, updated, 'Student promoted to confirmed participant');
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyInvitations,
  acceptInvitation,
  declineInvitation,
  withdrawInvitation,
  listEventResponses,
  promoteWaitlistStudent,
};


import { getState, mutate, delay, uid, now } from './store';
import { appConfig, transitions, eventStatuses } from '../config/appConfig';
import { matchesAudience } from '../utils/eligibility';
import { addDays, instantAt, todayIST, weekStartOf, fmtDate } from '../utils/dates';
import { scopedEvent, zoneEvents, zoneInstitutions, zoneInvitations, zoneStudents, requireOfficer, instName, logActivity, pushNotification, AccessError } from './zoneScopeService';
import { dayStateFor, weekInfo } from './availabilityService';
import { api } from './api';

export const eventStats = (oid, e) => {
  if (e.stats && typeof e.stats.accepted === 'number') return e.stats;
  const inv = zoneInvitations(oid).filter((i) => i.eventId === e.id);
  const n = (r) => inv.filter((i) => i.response === r).length;
  const accepted = n('accepted');
  return { invited: inv.length, accepted, declined: n('declined'), pending: n('pending'), withdrawn: n('withdrawn'), waitlisted: n('waitlisted'), present: inv.filter((i) => i.attendance === 'present').length, absent: inv.filter((i) => i.attendance === 'absent').length, excused: inv.filter((i) => i.attendance === 'excused').length, seatsLeft: e.capacity ? Math.max(0, e.capacity - accepted) : null };
};
export const listEvents = (oid, { q = '', category = '', status = '', institutionId = '', from = '', to = '' } = {}) => {
  const needle = q.trim().toLowerCase();
  return zoneEvents(oid).filter((e) => (!needle || e.title.toLowerCase().includes(needle)) && (!category || e.category === category) && (!status || e.status === status) && (!institutionId || (e.targetInstitutionIds || []).includes(institutionId)) && (!from || e.date >= from) && (!to || e.date <= to))
    .map((e) => ({ ...e, stats: e.stats || eventStats(oid, e), targetStudents: targetStudents(oid, e).length, institutionNames: e.institutionNames || (e.targetInstitutionIds || []).map(instName) })).sort((a, b) => b.date.localeCompare(a.date));
};
export const getEvent = (oid, id) => { const e = scopedEvent(oid, id); return e ? { ...e, stats: e.stats || eventStats(oid, e), institutionNames: e.institutionNames || (e.targetInstitutionIds || []).map(instName), targetCount: targetStudents(oid, e).length } : null; };

export const targetStudents = (oid, audience) => zoneStudents(oid).filter((s) => matchesAudience(s, { targetInstitutionIds: [], departments: [], years: [], groups: [], ...audience }));

/** Physical verification: targeted students split into eligible/excluded with a plain-language reason. Original availability is never modified. */
export const physicalEligibility = (oid, ev) => {
  const ws = weekStartOf(ev.date); const info = weekInfo(ws);
  const out = { eligible: [], excluded: [], counts: { available: 0, unavailable: 0, notSubmitted: 0 } };
  targetStudents(oid, ev).forEach((s) => {
    const rec = getState().availability[s.id]?.[ws] ?? null;
    const st = dayStateFor(rec, info, ev.date);
    if (st === 'available') { out.eligible.push(s); out.counts.available++; return; }
    const reason = { unavailable: `Marked Unavailable on ${fmtDate(ev.date)}.`, not_selected: 'Submitted availability but left this date unselected.', draft: 'Availability is still a draft (not submitted).', not_submitted: 'No availability submitted for this week.', system_assumed_unavailable: 'Deadline passed without submission (System-Assumed Unavailable).' }[st];
    out.excluded.push({ student: s, reason, state: st });
    if (st === 'unavailable') out.counts.unavailable++; else out.counts.notSubmitted++;
  });
  return out;
};
const audienceFor = (oid, ev) => (ev.category === 'physical_verification' ? physicalEligibility(oid, ev).eligible : targetStudents(oid, ev));

const timeRange = (e) => (e.startTime ? [instantAt(e.date, e.startTime), instantAt(e.date, e.endTime ?? e.startTime)] : null);
/** Warns (never blocks) when events on the same date/time target overlapping students. */
export const findConflicts = (oid, draft) => {
  const mine = new Set(targetStudents(oid, draft).map((s) => s.id)); const a = timeRange(draft);
  return zoneEvents(oid).filter((e) => e.id !== draft.id && e.date === draft.date && !['cancelled', 'draft', 'completed'].includes(e.status)).map((e) => {
    const b = timeRange(e); const overlapTime = a && b ? a[0] < b[1] && b[0] < a[1] : true;
    const shared = targetStudents(oid, e).filter((s) => mine.has(s.id)).length;
    return overlapTime && shared ? { event: e, sharedStudents: shared, exactTime: !!(a && b) } : null;
  }).filter(Boolean);
};

export const validateEvent = (oid, d) => {
  const errs = [];
  if (!d.title || d.title.trim().length < 3) errs.push('Title must be at least 3 characters.');
  if (!d.targetInstitutionIds?.length) errs.push('Select at least one target institution.');
  const allowed = new Set(zoneInstitutions(oid).map((i) => i.id));
  if (d.targetInstitutionIds?.some((id) => !allowed.has(id))) throw new AccessError('One or more selected institutions are outside your zone.'); // server-side style check
  if (d.startTime && d.endTime && d.endTime <= d.startTime) errs.push('End time must be after start time.');
  if (d.responseDeadline && instantAt(d.date, d.startTime || '00:00') < Date.parse(d.responseDeadline)) errs.push('Response deadline must be before the event starts.');
  if (errs.length) throw new Error(errs.join(' '));
};

const invite = (oid, e) => {
  const have = new Set(getState().invitations.filter((i) => i.eventId === e.id).map((i) => i.studentId));
  const fresh = audienceFor(oid, e).filter((s) => !have.has(s.id));
  mutate((s) => fresh.forEach((st) => s.invitations.push({ id: `inv-${e.id}-${st.id}`, eventId: e.id, studentId: st.id, response: 'pending', answers: {}, invitedAt: now(), respondedAt: null, attendance: null, attendanceAt: null, attendanceBy: null })));
  return fresh.length;
};

/** Zone is taken from the officer account – any zoneId in the payload is ignored. */
export const createEvent = async (oid, payload, { send = false } = {}) => {
  await delay(500);
  const o = requireOfficer(oid); validateEvent(oid, payload);
  if (send && !appConfig.permissions.canPublishEvents) throw new AccessError('Publishing events is not permitted for this account.');
  const { zoneId: _ignored, ...data } = payload; void _ignored;
  const e = { ...data, id: uid('ev'), zoneId: o.zoneId, createdBy: o.id, createdAt: now(), status: 'draft', originalDate: null, statusNote: '' };
  mutate((s) => s.events.push(e));
  logActivity(oid, { type: 'event_created', description: 'Created event' + (send ? ' and sent invitations' : ' as draft'), related: { type: 'event', id: e.id, label: e.title } });

  if (api.getToken()) {
    try {
      const res = await api.post('/events', {
        title: data.title,
        category: data.category,
        date: data.date,
        startTime: data.startTime,
        endTime: data.endTime,
        mode: data.mode,
        venue: data.venue,
        capacity: data.capacity,
        targetInstitutionIds: data.targetInstitutionIds,
      });
      if (res?.data?.id) e.id = res.data.id;
    } catch (err) {
      console.warn('Backend event creation sync notice:', err.message);
    }
  }

  if (send) await changeStatus(oid, e.id, 'invitations_open');
  return e;
};

export const changeStatus = async (oid, id, to, { newDate, reason } = {}) => {
  await delay(350);
  const e = scopedEvent(oid, id); if (!e) throw new AccessError('Event not found.');
  const p = appConfig.permissions;
  if (!(transitions[e.status] ?? []).includes(to)) throw new Error(`Cannot move an event from ${eventStatuses[e.status]} to ${eventStatuses[to]}.`);
  if (['published', 'invitations_open'].includes(to) && !p.canPublishEvents) throw new AccessError('Publishing is not permitted for this account.');
  if (to === 'cancelled' && !p.canCancelEvents) throw new AccessError('Cancelling events is not permitted for this account.');
  if (to === 'postponed' && !p.canPostponeEvents) throw new AccessError('Postponing events is not permitted for this account.');
  if (to === 'postponed' && (!newDate || newDate <= todayIST(now()))) throw new Error('Choose a new date in the future.');
  let invited = 0;
  if (to === 'invitations_open') invited = invite(oid, e);
  mutate((s) => { const x = s.events.find((v) => v.id === id); x.status = to; if (to === 'postponed') { x.originalDate = x.date; x.date = newDate; x.statusNote = reason || 'Postponed by the zone officer.'; } if (to === 'cancelled') x.statusNote = reason || 'Cancelled by the zone officer.'; });
  const map = { published: ['event_published', 'Published event'], invitations_open: ['invitation_sent', `Invitations sent (${invited} new students)`], in_progress: ['event_updated', 'Marked event In Progress'], completed: ['event_updated', 'Marked event Completed'], postponed: ['event_postponed', `Postponed event to ${newDate}`], cancelled: ['event_cancelled', 'Cancelled event'] }[to];
  logActivity(oid, { type: map[0], description: map[1], related: { type: 'event', id, label: e.title } });

  if (api.getToken()) {
    try {
      if (to === 'invitations_open') await api.post(`/events/${id}/publish`);
      else if (to === 'postponed') await api.post(`/events/${id}/postpone`, { newDate, reason });
      else if (to === 'cancelled') await api.post(`/events/${id}/cancel`, { reason });
    } catch (err) {
      console.warn('Backend event status sync notice:', err.message);
    }
  }

  if (['postponed', 'cancelled'].includes(to)) pushNotification(oid, { category: to === 'postponed' ? 'event_postponed' : 'event_cancelled', title: `Event ${to}: ${e.title}`, body: 'Real delivery dispatched via backend notification engine.', link: { type: 'event', eventId: id } });
};

export const eventQuestionsAnswers = (e, inv) => e.questions.map((q) => ({ q, a: inv.answers[q.id] ?? '' }));

export const listResponses = (oid, eventId, { response = '', q = '', institutionId = '' } = {}) => {
  const e = scopedEvent(oid, eventId); if (!e) return null;
  const needle = q.trim().toLowerCase(); const studs = new Map(zoneStudents(oid).map((s) => [s.id, s]));
  const rows = zoneInvitations(oid).filter((i) => i.eventId === eventId).map((i) => ({ ...i, student: studs.get(i.studentId) })).filter((r) => r.student && (!response || r.response === response) && (!institutionId || r.student.institutionId === institutionId) && (!needle || r.student.name.toLowerCase().includes(needle) || r.student.studentId.toLowerCase().includes(needle)));
  return rows.sort((a, b) => (a.respondedAt ?? 9e15) - (b.respondedAt ?? 9e15));
};
export const waitlistPosition = (oid, eventId, invId) => { const w = zoneInvitations(oid).filter((i) => i.eventId === eventId && i.response === 'waitlisted').sort((a, b) => a.respondedAt - b.respondedAt); return w.findIndex((i) => i.id === invId) + 1; };

export const promoteFromWaitlist = async (oid, eventId, invId) => {
  await delay(300);
  const e = scopedEvent(oid, eventId); if (!e) throw new AccessError('Event not found.');
  if (!appConfig.permissions.canPromoteWaitlist) throw new AccessError('Waitlist promotion is not permitted for this account.');
  if (eventStats(oid, e).seatsLeft <= 0) throw new Error('No seats are available.');
  const inv = zoneInvitations(oid).find((i) => i.id === invId && i.eventId === eventId && i.response === 'waitlisted'); if (!inv) throw new Error('Waitlisted student not found.');
  mutate((s) => { s.invitations.find((i) => i.id === invId).response = 'accepted'; });
  logActivity(oid, { type: 'event_updated', description: 'Promoted a student from the waitlist', related: { type: 'event', id: eventId, label: e.title } });
};

/** Who would receive a reminder, and why (preview only – nothing is sent). */
export const reminderPreview = (oid, eventId) => {
  const e = scopedEvent(oid, eventId); if (!e) return null;
  const studs = new Map(zoneStudents(oid).map((s) => [s.id, s]));
  return zoneInvitations(oid).filter((i) => i.eventId === eventId && i.response === 'pending').map((i) => ({ student: studs.get(i.studentId), reason: 'Invitation sent but no response yet.' }));
};
export const eventHistory = (oid, eventId) => getState().activity.filter((a) => a.zoneId === requireOfficer(oid).zoneId && a.related?.id === eventId).sort((a, b) => b.at - a.at);
export const addDaysTo = addDays;
export const audienceOptions = (oid) => ({ groups: [...new Set(zoneStudents(oid).flatMap((s) => s.groups))].sort(), departments: [...new Set(zoneStudents(oid).map((s) => s.department))].sort() });

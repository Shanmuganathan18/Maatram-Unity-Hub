import { getState, mutate, delay } from './store';
import { now } from './clock';
import { isEligibleForEvent } from './eligibilityService';
import { todayIST, instantAt } from '../utils/dates';

const student = (sid) => getState().students.find((s) => s.id === sid);
const sortKey = (e) => `${e.date}T${e.startTime ?? '00:00'}`;

/** Events targeted to this student (audience + physical-verification eligibility). */
export const getEventsForStudent = (sid) => {
  const st = student(sid);
  const invs = getState().invitations[sid] ?? {};
  return getState().events.filter((e) => invs[e.id] && isEligibleForEvent(st, e)).map((e) => ({ event: e, invitation: invs[e.id] })).sort((a, b) => sortKey(a.event).localeCompare(sortKey(b.event)));
};
export const getEventForStudent = (sid, id) => getEventsForStudent(sid).find((x) => x.event.id === id) ?? null;

export const isPast = (event, nowMs = now()) => event.status === 'completed' || event.date < todayIST(nowMs);
export const responseDeadlinePassed = (event, nowMs = now()) => !!event.responseDeadline && Date.parse(event.responseDeadline) < nowMs;

export const canRespond = (event, nowMs = now()) => {
  if (event.status === 'cancelled') return { ok: false, reason: 'This event has been cancelled.' };
  if (isPast(event, nowMs)) return { ok: false, reason: 'This event has already taken place.' };
  if (responseDeadlinePassed(event, nowMs)) return { ok: false, reason: 'The response deadline has passed.' };
  return { ok: true };
};

export const respond = async (sid, eventId, { response, answers = {}, declineReason = '' }) => {
  await delay(450);
  const item = getEventForStudent(sid, eventId);
  if (!item) throw new Error('This event is not available for your account.');
  const c = canRespond(item.event);
  if (!c.ok) throw new Error(c.reason);
  if (!['accepted', 'declined'].includes(response)) throw new Error('Invalid response.');
  if (response === 'declined' && item.event.declineReasonRequired && !declineReason.trim()) throw new Error('Please give a reason for declining.');
  const t = now();
  mutate((s) => { s.invitations[sid][eventId] = { response, answers: response === 'accepted' ? answers : {}, declineReason: response === 'declined' ? declineReason.trim() : '', respondedAt: t }; });
};

export const withdraw = async (sid, eventId) => {
  await delay(350);
  const item = getEventForStudent(sid, eventId);
  if (!item || !item.event.allowWithdraw || item.invitation.response !== 'accepted') throw new Error('Withdrawal is not allowed for this event.');
  const c = canRespond(item.event);
  if (!c.ok) throw new Error(c.reason);
  mutate((s) => { Object.assign(s.invitations[sid][eventId], { response: 'withdrawn', respondedAt: now() }); });
};

// ---- conflicts: never auto-decline; time conflict only when both times known, else date-level "potential" ----
const range = (e) => (e.startTime ? [instantAt(e.date, e.startTime), instantAt(e.date, e.endTime ?? e.startTime)] : null);
export const getConflicts = (sid, eventId) => {
  const all = getEventsForStudent(sid);
  const me = all.find((x) => x.event.id === eventId);
  if (!me || !['pending', 'accepted'].includes(me.invitation.response) || me.event.status === 'cancelled' || isPast(me.event)) return [];
  const a = range(me.event);
  return all.filter((x) => x.event.id !== eventId && x.invitation.response === 'accepted' && x.event.status !== 'cancelled' && x.event.date === me.event.date).map((x) => {
    const b = range(x.event);
    if (a && b) return a[0] < b[1] && b[0] < a[1] ? { event: x.event, type: 'time' } : null;
    return { event: x.event, type: 'date' };
  }).filter(Boolean);
};

// ---- feedback ----
export const getFeedback = (sid, eventId) => getState().feedback[sid]?.[eventId] ?? null;
export const canGiveFeedback = (event, invitation) => event.feedbackEnabled && event.status === 'completed' && invitation.response === 'accepted';
export const submitFeedback = async (sid, eventId, fb) => {
  await delay();
  const item = getEventForStudent(sid, eventId);
  if (!item || !canGiveFeedback(item.event, item.invitation)) throw new Error('Feedback is not open for this event.');
  mutate((s) => { (s.feedback[sid] ||= {})[eventId] = { ...fb, submittedAt: now() }; });
};

export const getAcceptedUpcoming = (sid) => getEventsForStudent(sid).filter(({ event, invitation }) => invitation.response === 'accepted' && event.status !== 'cancelled' && !isPast(event));

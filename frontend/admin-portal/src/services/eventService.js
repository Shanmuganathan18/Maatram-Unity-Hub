import { getState, mutate, delay, now } from './store';
import { need, audit } from './accessService';
import { filterEvents, eventStats, instName, zoneName, officerName, settings, invitationsOf } from './metrics';
import { todayIST } from '../utils/dates';
import { api } from './api';

export const approvalEnabled = () => settings().events.approvalEnabled;
const row = (e) => ({ ...e, zoneLabel: zoneName(e.zoneId), officer: officerName(e.createdBy), institutionNames: e.targetInstitutionIds.map(instName), stats: eventStats(e) });
export const listEvents = (aid, f = {}) => { need(aid, 'events.view'); return filterEvents(f).map(row).sort((a, b) => b.date.localeCompare(a.date)); };
export const getEventDetail = (aid, id) => {
  need(aid, 'events.view'); const st = getState(); const e = st.events.find((x) => x.id === id); if (!e) return null;
  const studs = new Map(st.students.map((s) => [s.id, s])); const inv = invitationsOf(id).map((i) => ({ ...i, student: studs.get(i.studentId) }));
  return { event: row(e), invitations: inv, activity: st.auditLogs.filter((a) => a.related?.id === id).sort((a, b) => b.at - a.at) };
};
const find = (id) => { const e = getState().events.find((x) => x.id === id); if (!e) throw new Error('Event not found.'); return e; };
const log = (aid, e, action, description) => audit(aid, { action, category: 'Event', description, zoneId: e.zoneId, related: { type: 'event', id: e.id, label: e.title } });

/** Optional approval workflow – only available when enabled in System Settings (client has not confirmed it exists). */
export const reviewEvent = async (aid, id, decision, note = '') => {
  need(aid, decision === 'approved' ? 'events.approve' : 'events.reject'); await delay(350);
  if (!approvalEnabled()) throw new Error('The event approval workflow is not enabled.'); const e = find(id);
  if (decision !== 'approved' && !note.trim()) throw new Error('Add a note for the officer.');
  mutate((s) => { const x = s.events.find((v) => v.id === id); x.approvalStatus = decision; x.approvalNote = note; });
  log(aid, e, `event.${decision}`, `${{ approved: 'Approved', rejected: 'Rejected', changes_requested: 'Requested changes for' }[decision]} event${note ? ` – ${note}` : ''}`);
};
export const postponeEvent = async (aid, id, newDate, reason) => {
  need(aid, 'events.postpone'); await delay(350); const e = find(id);
  if (!['published', 'invitations_open'].includes(e.status)) throw new Error('Only published events can be postponed.'); if (!newDate || newDate <= todayIST(now())) throw new Error('Choose a future date.');
  mutate((s) => { const x = s.events.find((v) => v.id === id); x.status = 'postponed'; x.originalDate = x.date; x.date = newDate; x.statusNote = reason || 'Postponed by an administrator.'; }); log(aid, e, 'event.postponed', `Postponed event to ${newDate}`);

  if (api.getToken()) {
    try {
      await api.post(`/events/${id}/postpone`, { newDate, reason });
    } catch (err) {
      console.warn('Backend postpone event sync notice:', err.message);
    }
  }
};
export const cancelEvent = async (aid, id, reason) => {
  need(aid, 'events.cancel'); await delay(350); const e = find(id);
  if (['completed', 'cancelled'].includes(e.status)) throw new Error('This event can no longer be cancelled.'); if (!reason?.trim()) throw new Error('A reason is required to cancel an event.');
  mutate((s) => { const x = s.events.find((v) => v.id === id); x.status = 'cancelled'; x.statusNote = reason; }); log(aid, e, 'event.cancelled', `Cancelled event – ${reason}`);

  if (api.getToken()) {
    try {
      await api.post(`/events/${id}/cancel`, { reason });
    } catch (err) {
      console.warn('Backend cancel event sync notice:', err.message);
    }
  }
};
export const officersForFilter = () => getState().officers.map((o) => ({ value: o.id, label: o.name }));

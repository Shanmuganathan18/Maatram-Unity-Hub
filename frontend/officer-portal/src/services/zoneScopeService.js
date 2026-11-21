/**
 * ZONE SCOPE = the single authorization gate of the mock layer.
 * - The zone is ALWAYS derived from the authenticated officer's account (officer id from the session),
 *   never from a zoneId sent by the UI, URL or request body.
 * - Every lookup by id returns null (as "not found") when the record belongs to another zone, so changing a URL
 *   cannot reveal cross-zone data (IDOR protection).
 * In production the Node/Express backend must do the same after verifying the Supabase token.
 */
import { getState, mutate, uid, now } from './store';

export class AccessError extends Error { constructor(m = 'You do not have access to this record.') { super(m); this.name = 'AccessError'; } }

export const requireOfficer = (oid) => {
  const o = getState().officers.find((x) => x.id === oid);
  if (!o) throw new AccessError('Not signed in.');
  if (o.status !== 'Active') throw new AccessError('This account is not active.');
  return o;
};
export const zoneIdOf = (oid) => requireOfficer(oid).zoneId;
export const zoneInstitutions = (oid) => { const z = zoneIdOf(oid); return getState().institutions.filter((i) => i.zoneId === z); };
export const zoneStudents = (oid) => { const z = zoneIdOf(oid); return getState().students.filter((s) => s.zoneId === z); };
export const zoneEvents = (oid) => { const z = zoneIdOf(oid); return getState().events.filter((e) => e.zoneId === z); };
export const zoneInvitations = (oid) => { const ids = new Set(zoneEvents(oid).map((e) => e.id)); return getState().invitations.filter((i) => ids.has(i.eventId)); };
export const scopedStudent = (oid, id) => zoneStudents(oid).find((s) => s.id === id) ?? null;
export const scopedInstitution = (oid, id) => zoneInstitutions(oid).find((i) => i.id === id) ?? null;
export const scopedEvent = (oid, id) => zoneEvents(oid).find((e) => e.id === id) ?? null;
export const instName = (id) => getState().institutions.find((i) => i.id === id)?.name ?? '—';
export const instCode = (id) => getState().institutions.find((i) => i.id === id)?.code ?? '—';

/** Append an audit record. Officers can never edit or delete these (no API exists for it). */
export const logActivity = (oid, { type, description, related }) => {
  const o = requireOfficer(oid);
  mutate((s) => { s.activity.push({ id: uid('ac'), zoneId: o.zoneId, actorId: o.id, actorName: o.name, type, description, at: now(), related: related ?? null }); });
};
export const pushNotification = (oid, n) => {
  const o = requireOfficer(oid);
  mutate((s) => { s.notifications.push({ id: uid('n'), zoneId: o.zoneId, read: false, createdAt: now(), link: null, ...n }); });
};

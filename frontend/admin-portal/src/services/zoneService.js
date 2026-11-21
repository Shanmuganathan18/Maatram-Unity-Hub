import { getState, mutate, delay, uid, now } from './store';
import { need, audit } from './accessService';
import { zoneMetrics, institutionMetrics, filterEvents, eventStats } from './metrics';

const CODE = /^[A-Z0-9-]{2,8}$/;
export const listZones = (aid, { q = '', status = '', sort = 'name' } = {}) => {
  need(aid, 'zones.view'); const st = getState(); const n = q.trim().toLowerCase();
  const rows = st.zones.filter((z) => (!n || `${z.name} ${z.code} ${z.region}`.toLowerCase().includes(n)) && (!status || z.status === status))
    .map((z) => ({ ...z, ...zoneMetrics(z.id), officerNames: st.officers.filter((o) => o.zoneId === z.id).map((o) => o.name) }));
  rows.sort((a, b) => (sort === 'students' ? b.students - a.students : sort === 'institutions' ? b.institutions - a.institutions : a.name.localeCompare(b.name)));
  return rows;
};
export const getZoneDetail = (aid, id) => {
  need(aid, 'zones.view'); const st = getState(); const z = st.zones.find((x) => x.id === id); if (!z) return null;
  const events = filterEvents({ zoneId: id }); const byStatus = {}; events.forEach((e) => { byStatus[e.status] = (byStatus[e.status] ?? 0) + 1; });
  return { zone: z, metrics: zoneMetrics(id), officers: st.officers.filter((o) => o.zoneId === id), institutions: st.institutions.filter((i) => i.zoneId === id).map((i) => ({ ...i, ...institutionMetrics(i.id) })), eventsByStatus: byStatus, events: events.map((e) => ({ ...e, stats: eventStats(e) })), activity: st.auditLogs.filter((a) => a.zoneId === id).sort((a, b) => b.at - a.at).slice(0, 8) };
};
const validate = (d, selfId) => {
  const e = [];
  if (!d.name?.trim() || d.name.trim().length < 3) e.push('Zone name must be at least 3 characters.');
  if (!CODE.test(d.code ?? '')) e.push('Zone code must be 2–8 characters: capital letters, digits or hyphen.');
  if (getState().zones.some((z) => z.id !== selfId && z.code === d.code)) e.push(`Zone code ${d.code} is already used.`);
  if (!d.region?.trim()) e.push('Region is required.');
  if (!['Active', 'Inactive'].includes(d.status)) e.push('Choose a valid status.');
  if (e.length) throw new Error(e.join(' '));
};
export const createZone = async (aid, d) => {
  need(aid, 'zones.create'); await delay(400); validate(d);
  const z = { id: uid('zone'), code: d.code.trim(), name: d.name.trim(), region: d.region.trim(), description: d.description?.trim() ?? '', status: d.status, createdAt: now() };
  mutate((s) => s.zones.push(z)); audit(aid, { action: 'zone.created', category: 'Zone', description: `Created zone ${z.code}`, zoneId: z.id, related: { type: 'zone', id: z.id, label: z.name } }); return z;
};
export const updateZone = async (aid, id, d) => {
  need(aid, 'zones.edit'); await delay(350); validate(d, id);
  mutate((s) => Object.assign(s.zones.find((z) => z.id === id), { name: d.name.trim(), code: d.code.trim(), region: d.region.trim(), description: d.description?.trim() ?? '' }));
  audit(aid, { action: 'zone.updated', category: 'Zone', description: `Updated zone ${d.code}`, zoneId: id, related: { type: 'zone', id, label: d.name } });
};
export const zoneStatusImpact = (id) => { const st = getState(); return { institutions: st.institutions.filter((i) => i.zoneId === id).length, students: st.students.filter((s) => s.zoneId === id).length, officers: st.officers.filter((o) => o.zoneId === id).length, liveEvents: st.events.filter((e) => e.zoneId === id && ['published', 'invitations_open', 'in_progress'].includes(e.status)).length }; };
/** Zones are never hard-deleted: deactivate or archive instead. */
export const setZoneStatus = async (aid, id, status) => {
  need(aid, status === 'Active' ? 'zones.edit' : 'zones.deactivate'); await delay(350);
  const z = getState().zones.find((x) => x.id === id); if (!z) throw new Error('Zone not found.');
  if (status === 'Archived' && zoneStatusImpact(id).liveEvents) throw new Error('This zone has live events. Complete or cancel them before archiving.');
  mutate((s) => { s.zones.find((x) => x.id === id).status = status; });
  audit(aid, { action: 'zone.updated', category: 'Zone', description: `Set zone ${z.code} to ${status}`, zoneId: id, related: { type: 'zone', id, label: z.name } });
};
export const deleteBlockedReason = (id) => { const i = zoneStatusImpact(id); return i.institutions || i.students || i.officers ? `This zone has ${i.institutions} institution(s), ${i.students} student(s) and ${i.officers} officer(s). Zones are archived or deactivated, never deleted.` : 'Deletion is not offered; archive the zone instead.'; };

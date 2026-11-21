import { getState, mutate, delay, uid, now } from './store';
import { need, audit } from './accessService';
import { zoneMetrics, zoneName, filterEvents, eventStats } from './metrics';

const view = (o) => ({ ...o, zoneLabel: o.zoneId ? zoneName(o.zoneId) : 'Unassigned' });
export const listOfficers = (aid, { q = '', zoneId = '', status = '', designation = '', sort = 'name' } = {}) => {
  need(aid, 'officers.view'); const n = q.trim().toLowerCase();
  const rows = getState().officers.filter((o) => (!n || `${o.name} ${o.email} ${o.officerId}`.toLowerCase().includes(n)) && (!zoneId || (zoneId === 'none' ? !o.zoneId : o.zoneId === zoneId)) && (!status || o.status === status) && (!designation || o.designation === designation)).map(view);
  rows.sort((a, b) => (sort === 'created' ? b.createdAt - a.createdAt : a.name.localeCompare(b.name))); return rows;
};
export const getOfficerDetail = (aid, id) => {
  need(aid, 'officers.view'); const st = getState(); const o = st.officers.find((x) => x.id === id); if (!o) return null;
  return { officer: view(o), institutions: o.zoneId ? st.institutions.filter((i) => i.zoneId === o.zoneId) : [], summary: o.zoneId ? zoneMetrics(o.zoneId) : null, events: filterEvents({ officerId: id }).map((e) => ({ ...e, stats: eventStats(e) })), activity: st.auditLogs.filter((a) => a.actorId === id || a.related?.id === id).sort((a, b) => b.at - a.at) };
};
const validate = (d, selfId) => {
  const st = getState(); const e = [];
  if (!d.name?.trim() || d.name.trim().length < 3) e.push('Full name is required.');
  if (!/^\S+@\S+\.\S+$/.test(d.email ?? '')) e.push('Enter a valid email address.');
  else if (st.officers.some((o) => o.id !== selfId && o.email.toLowerCase() === d.email.toLowerCase())) e.push('An officer with this email already exists.');
  if (!/^[6-9]\d{9}$/.test(d.phone ?? '')) e.push('Enter a valid 10-digit mobile number.');
  if (!/^[A-Z0-9-]{4,14}$/.test(d.officerId ?? '')) e.push('Officer ID: 4–14 capital letters, digits or hyphen.');
  else if (st.officers.some((o) => o.id !== selfId && o.officerId === d.officerId)) e.push('This Officer ID is already used.');
  if (!d.designation) e.push('Choose a designation.');
  if (d.zoneId && !st.zones.find((z) => z.id === d.zoneId && z.status === 'Active')) e.push('Choose an active zone (or leave unassigned).');
  if (e.length) throw new Error(e.join(' '));
};
/** Invitation/activation is simulated: no email, no password is collected or shown. */
export const createOfficer = async (aid, d) => {
  need(aid, 'officers.create'); await delay(450); validate(d);
  const o = { id: uid('off'), officerId: d.officerId, name: d.name.trim(), email: d.email.trim(), phone: d.phone, designation: d.designation, zoneId: d.zoneId || null, status: 'Pending Activation', lastLogin: null, createdAt: now() };
  mutate((s) => s.officers.push(o)); audit(aid, { action: 'officer.created', category: 'User', description: `Invited officer ${o.name} (simulated invitation)`, zoneId: o.zoneId, related: { type: 'officer', id: o.id, label: o.name } }); return o;
};
export const updateOfficer = async (aid, id, d) => {
  need(aid, 'officers.edit'); await delay(350); validate({ ...getState().officers.find((o) => o.id === id), ...d }, id);
  mutate((s) => { const o = s.officers.find((x) => x.id === id); Object.assign(o, { name: d.name.trim(), phone: d.phone, designation: d.designation, email: d.email.trim() }); });
  audit(aid, { action: 'officer.updated', category: 'User', description: `Updated officer ${d.name}`, related: { type: 'officer', id, label: d.name } });
};
export const setOfficerStatus = async (aid, id, status) => {
  need(aid, 'officers.toggle'); await delay(300); const o = getState().officers.find((x) => x.id === id); if (!o) throw new Error('Officer not found.');
  mutate((s) => { s.officers.find((x) => x.id === id).status = status; });
  audit(aid, { action: status === 'Inactive' ? 'officer.deactivated' : 'officer.status_changed', category: 'User', description: `Set officer ${o.name} to ${status}`, zoneId: o.zoneId, related: { type: 'officer', id, label: o.name } });
};
/** Only an admin with officers.reassign can change an officer's zone – an officer can never self-assign. */
export const reassignOfficer = async (aid, id, zoneId) => {
  need(aid, 'officers.reassign'); await delay(400); const st = getState(); const o = st.officers.find((x) => x.id === id); if (!o) throw new Error('Officer not found.');
  if (!st.zones.find((z) => z.id === zoneId && z.status === 'Active')) throw new Error('Choose an active zone.');
  if (o.zoneId === zoneId) throw new Error('The officer is already assigned to this zone.');
  const from = o.zoneId; mutate((s) => { s.officers.find((x) => x.id === id).zoneId = zoneId; });
  audit(aid, { action: 'officer.reassigned', category: 'User', description: `Reassigned ${o.name} from ${from ? zoneName(from) : 'Unassigned'} to ${zoneName(zoneId)}`, zoneId, related: { type: 'officer', id, label: o.name } });
};

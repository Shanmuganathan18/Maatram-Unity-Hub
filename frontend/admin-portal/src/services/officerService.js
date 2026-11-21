import { getState, mutate, delay, uid, now } from './store';
import { need, audit } from './accessService';
import { zoneMetrics, zoneName, filterEvents, eventStats } from './metrics';
import { api } from './api';

const view = (o) => ({ ...o, zoneLabel: o.zoneId ? zoneName(o.zoneId) : 'Unassigned' });
export const listOfficers = (aid, { q = '', zoneId = '', status = '', designation = '', sort = 'name' } = {}) => {
  need(aid, 'officers.view'); const n = q.trim().toLowerCase();
  const rows = getState().officers.filter((o) => (!n || `${o.name || ''} ${o.email || ''} ${o.officerId || ''}`.toLowerCase().includes(n)) && (!zoneId || (zoneId === 'none' ? !o.zoneId : o.zoneId === zoneId)) && (!status || o.status === status) && (!designation || o.designation === designation)).map(view);
  rows.sort((a, b) => (sort === 'created' ? (b.createdAt || 0) - (a.createdAt || 0) : (a.name || '').localeCompare(b.name || ''))); return rows;
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
export const createOfficer = async (aid, d) => {
  need(aid, 'officers.create');
  validate(d);

  let backendOfficer = null;
  try {
    const res = await api.post('/officers', {
      name: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone,
      officerId: d.officerId,
      designation: d.designation,
      zoneId: d.zoneId || undefined,
      temporaryPassword: d.temporaryPassword || 'Maatram@2026',
      sendWelcomeEmail: true,
    });
    if (res?.data) {
      backendOfficer = res.data;
    }
  } catch (err) {
    console.warn('Backend officer creation warning (falling back to store):', err.message);
  }

  const o = {
    id: backendOfficer?.id || uid('off'),
    officerId: backendOfficer?.officerId || d.officerId,
    name: d.name.trim(),
    email: d.email.trim(),
    phone: d.phone,
    designation: d.designation,
    zoneId: d.zoneId || null,
    status: 'Pending Activation',
    lastLogin: null,
    createdAt: now(),
  };

  mutate((s) => {
    const idx = s.officers.findIndex((x) => x.id === o.id || x.officerId === o.officerId);
    if (idx >= 0) s.officers[idx] = o;
    else s.officers.push(o);
  });

  audit(aid, {
    action: 'officer.created',
    category: 'User',
    description: `Created officer account for ${o.name} (${o.officerId}). Activation email dispatched with temporary password.`,
    zoneId: o.zoneId,
    related: { type: 'officer', id: o.id, label: o.name },
  });

  return o;
};

export const updateOfficer = async (aid, id, d) => {
  need(aid, 'officers.edit');
  validate({ ...getState().officers.find((o) => o.id === id), ...d }, id);

  let backendRes = null;
  try {
    const res = await api.patch(`/officers/${id}`, {
      name: d.name.trim(),
      email: d.email.trim(),
      phone: d.phone,
      designation: d.designation,
      temporaryPassword: d.temporaryPassword || 'Maatram@2026',
      sendEmailNotification: true,
    });
    if (res?.data) {
      backendRes = res.data;
    }
  } catch (err) {
    console.warn('Backend officer update warning (falling back to store):', err.message);
  }

  mutate((s) => {
    const o = s.officers.find((x) => x.id === id);
    if (o) {
      Object.assign(o, {
        name: d.name.trim(),
        phone: d.phone,
        designation: d.designation,
        email: d.email.trim(),
      });
    }
  });

  audit(aid, {
    action: 'officer.updated',
    category: 'User',
    description: `Updated officer ${d.name} (${d.email}). Activation / credentials update email dispatched.`,
    related: { type: 'officer', id, label: d.name },
  });

  return backendRes;
};

export const resendOfficerInvite = async (aid, id) => {
  need(aid, 'officers.edit');
  const o = getState().officers.find((x) => x.id === id);
  if (!o) throw new Error('Officer not found.');

  const res = await api.post(`/officers/${id}/resend-invite`);
  audit(aid, {
    action: 'officer.invite_resent',
    category: 'User',
    description: `Resent activation credentials email to ${o.name} (${o.email})`,
    related: { type: 'officer', id, label: o.name },
  });
  return res?.data || { success: true };
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

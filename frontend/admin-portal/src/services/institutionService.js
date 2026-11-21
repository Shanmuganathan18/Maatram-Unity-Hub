import { getState, mutate, delay, uid, now } from './store';
import { need, audit } from './accessService';
import { institutionMetrics, zoneName, weekOptions, matrix, weekStats, filterEvents, eventStats } from './metrics';

const view = (i) => ({ ...i, zoneLabel: i.zoneId ? zoneName(i.zoneId) : 'Unassigned', ...institutionMetrics(i.id) });
export const listInstitutions = (aid, { q = '', zoneId = '', status = '', type = '', sort = 'name' } = {}) => {
  need(aid, 'institutions.view'); const n = q.trim().toLowerCase();
  const rows = getState().institutions.filter((i) => (!n || `${i.name} ${i.code} ${i.location}`.toLowerCase().includes(n)) && (!zoneId || (zoneId === 'none' ? !i.zoneId : i.zoneId === zoneId)) && (!status || i.status === status) && (!type || i.type === type)).map(view);
  rows.sort((a, b) => (sort === 'students' ? b.students - a.students : a.name.localeCompare(b.name))); return rows;
};
export const institutionTypes = () => [...new Set(getState().institutions.map((i) => i.type))].sort();
export const getInstitutionDetail = (aid, id) => {
  need(aid, 'institutions.view'); const st = getState(); const i = st.institutions.find((x) => x.id === id); if (!i) return null;
  const studs = st.students.filter((s) => s.institutionId === id); const years = {}; studs.forEach((s) => { years[s.year] = (years[s.year] ?? 0) + 1; });
  const evs = filterEvents({ institutionId: id }).map((e) => { const ids = new Set(studs.map((s) => s.id)); const inv = st.invitations.filter((v) => v.eventId === e.id && ids.has(v.studentId)); return { event: e, invited: inv.length, accepted: inv.filter((v) => v.response === 'accepted').length, present: inv.filter((v) => v.attendance === 'present').length }; });
  return { institution: view(i), years: Object.entries(years).map(([name, value]) => ({ name: `Year ${name}`, value })), weekly: weekOptions().map((ws) => ({ weekStart: ws, ...weekStats(matrix(ws, { institutionId: id }).rows) })), events: evs, activity: st.auditLogs.filter((a) => a.related?.id === id).sort((a, b) => b.at - a.at), studentCount: studs.length };
};
const validate = (d, selfId) => {
  const st = getState(); const e = [];
  if (!d.name?.trim() || d.name.trim().length < 3) e.push('Institution name is required.');
  if (!/^[A-Z0-9-]{2,8}$/.test(d.code ?? '')) e.push('Code: 2–8 capital letters, digits or hyphen.');
  else if (st.institutions.some((i) => i.id !== selfId && i.code === d.code)) e.push(`Code ${d.code} is already used by another institution.`);
  if (!st.zones.find((z) => z.id === d.zoneId && z.status === 'Active')) e.push('Assign the institution to an active zone.');
  if (!d.location?.trim()) e.push('Location is required.');
  if (d.contactEmail && !/^\S+@\S+\.\S+$/.test(d.contactEmail)) e.push('Contact email is invalid.');
  if (d.contactPhone && !/^[6-9]\d{9}$/.test(d.contactPhone)) e.push('Contact phone must be a 10-digit mobile number.');
  if (!d.departments?.length) e.push('Add at least one department.');
  if (e.length) throw new Error(e.join(' '));
};
const clean = (d) => ({ name: d.name.trim(), code: d.code.trim(), zoneId: d.zoneId, location: d.location.trim(), type: d.type || 'Engineering', contactName: d.contactName?.trim() ?? '', contactEmail: d.contactEmail?.trim() ?? '', contactPhone: d.contactPhone?.trim() ?? '', departments: d.departments, status: d.status || 'Active' });
export const createInstitution = async (aid, d) => { need(aid, 'institutions.create'); await delay(400); validate(d); const i = { id: uid('inst'), createdAt: now(), ...clean(d) }; mutate((s) => s.institutions.push(i)); audit(aid, { action: 'institution.created', category: 'Institution', description: `Created institution ${i.code}`, zoneId: i.zoneId, related: { type: 'institution', id: i.id, label: i.name } }); return i; };
export const zoneChangeImpact = (id, zoneId) => ({ students: getState().students.filter((s) => s.institutionId === id && s.zoneId !== zoneId).length });
export const updateInstitution = async (aid, id, d) => {
  need(aid, 'institutions.edit'); await delay(400); validate(d, id); const old = { ...getState().institutions.find((i) => i.id === id) };
  mutate((s) => { Object.assign(s.institutions.find((i) => i.id === id), clean(d)); if (old.zoneId !== d.zoneId) s.students.forEach((x) => { if (x.institutionId === id) x.zoneId = d.zoneId; }); }); // students always follow their institution's zone
  audit(aid, { action: 'institution.updated', category: 'Institution', description: `Updated institution ${d.code}${old.zoneId !== d.zoneId ? ` (zone ${zoneName(old.zoneId)} → ${zoneName(d.zoneId)})` : ''}`, zoneId: d.zoneId, related: { type: 'institution', id, label: d.name } });
};
export const setInstitutionStatus = async (aid, id, status) => {
  need(aid, status === 'Active' ? 'institutions.edit' : 'institutions.deactivate'); await delay(300); const i = getState().institutions.find((x) => x.id === id);
  mutate((s) => { s.institutions.find((x) => x.id === id).status = status; }); audit(aid, { action: 'institution.updated', category: 'Institution', description: `Set institution ${i.code} to ${status}`, zoneId: i.zoneId, related: { type: 'institution', id, label: i.name } });
};
export const deleteBlockedReason = (id) => { const n = getState().students.filter((s) => s.institutionId === id).length; return n ? `${n} student(s) are mapped to this institution. Deactivate or archive it; deletion needs an approved migration process.` : 'Deletion is not offered; deactivate the institution instead.'; };
export const departmentOptions = () => [...new Set(getState().institutions.flatMap((i) => i.departments))].sort();

import { getState, mutate, delay } from './store';
import { need, audit, can, getAdmin } from './accessService';
import { zoneName } from './metrics';
import { roleLabel, adminRoleIds } from '../config/permissions';
import { api } from './api';

export const fetchUsersLive = async ({ q = '', role = '', status = '', page = 1, pageSize = 12 } = {}) => {
  const params = new URLSearchParams();
  if (q) params.append('q', q);
  if (role) params.append('role', role);
  if (status) params.append('status', status.toUpperCase());
  params.append('page', page);
  params.append('perPage', pageSize);

  const res = await api.get(`/users?${params.toString()}`);
  return res;
};

export const toggleUserStatusLive = async (id, status) => {
  const backendStatus = status === 'Active' ? 'ACTIVE' : status === 'Inactive' ? 'INACTIVE' : 'SUSPENDED';
  const res = await api.post(`/users/${id}/toggle-status`, { status: backendStatus });
  return res.data;
};

const all = () => { const st = getState(); return [
  ...st.students.map((s) => ({ key: `student:${s.id}`, ref: { type: 'student', id: s.id }, userId: s.studentId, name: s.name, email: s.email, role: 'student', zoneId: s.zoneId, status: s.status, lastLogin: s.lastLogin, createdAt: s.createdAt, link: `/students/${s.id}` })),
  ...st.officers.map((o) => ({ key: `officer:${o.id}`, ref: { type: 'officer', id: o.id }, userId: o.officerId, name: o.name, email: o.email, role: 'zone_officer', zoneId: o.zoneId, status: o.status, lastLogin: o.lastLogin, createdAt: o.createdAt, link: `/officers/${o.id}` })),
  ...st.admins.map((a) => ({ key: `admin:${a.id}`, ref: { type: 'admin', id: a.id }, userId: a.adminId, name: a.name, email: a.email, role: a.role, zoneId: null, status: a.status, lastLogin: a.lastLogin, createdAt: a.createdAt, link: null })),
].map((u) => ({ ...u, roleLabel: roleLabel(u.role), zoneLabel: u.role === 'student' || u.role === 'zone_officer' ? (u.zoneId ? zoneName(u.zoneId) : 'Unassigned') : '—' })); };

export const listUsers = (aid, { q = '', role = '', zoneId = '', status = '', sortKey = 'name', sortDir = 'asc', page = 1, pageSize = 12 } = {}) => {
  need(aid, 'users.view'); const n = q.trim().toLowerCase();
  const rows = all().filter((u) => (!n || `${u.name} ${u.email} ${u.userId}`.toLowerCase().includes(n)) && (!role || u.role === role || (role === 'admins' && adminRoleIds.includes(u.role))) && (!zoneId || u.zoneId === zoneId) && (!status || u.status === status));
  const d = sortDir === 'desc' ? -1 : 1; rows.sort((a, b) => (sortKey === 'created' ? a.createdAt - b.createdAt : sortKey === 'login' ? (a.lastLogin ?? 0) - (b.lastLogin ?? 0) : a.name.localeCompare(b.name)) * d);
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / pageSize)); const p = Math.min(page, pages); return { rows: rows.slice((p - 1) * pageSize, p * pageSize), total, page: p, pages };
};
const permFor = (aid, type) => (type === 'officer' ? can(aid, 'officers.toggle') : type === 'student' ? can(aid, 'students.toggle') || can(aid, 'users.toggle') : can(aid, 'users.toggle'));
export const canToggle = (aid, u) => permFor(aid, u.ref.type) && !(u.ref.type === 'admin' && u.ref.id === aid);

const apply = (s, ref, status) => { const list = ref.type === 'student' ? s.students : ref.type === 'officer' ? s.officers : s.admins; const x = list.find((v) => v.id === ref.id); if (x) x.status = status; };
export const setUserStatus = async (aid, ref, status) => {
  await delay(300); const u = all().find((x) => x.ref.type === ref.type && x.ref.id === ref.id); if (!u) throw new Error('User not found.');
  if (!canToggle(aid, u)) throw new Error('You cannot change the status of this account.');
  if (u.ref.type === 'admin' && status !== 'Active' && getState().admins.filter((a) => a.status === 'Active').length <= 1) throw new Error('The last active Administrator cannot be deactivated.');
  mutate((s) => apply(s, ref, status)); audit(aid, { action: 'user.status_changed', category: 'User', description: `Set ${u.roleLabel} ${u.name} to ${status}`, zoneId: u.zoneId, related: { type: ref.type, id: ref.id, label: u.name } });
};
/** Always call with an explicit affected-record count confirmed by the user. */
export const bulkSetUserStatus = async (aid, refs, status) => {
  await delay(500); const users = all().filter((u) => refs.some((r) => r.type === u.ref.type && r.id === u.ref.id)); const ok = users.filter((u) => canToggle(aid, u));
  if (!ok.length) throw new Error('None of the selected accounts can be changed with your permissions.');
  mutate((s) => ok.forEach((u) => apply(s, u.ref, status))); audit(aid, { action: 'user.bulk_status', category: 'User', description: `Bulk set ${ok.length} account(s) to ${status} (${users.length - ok.length} skipped)` }); return { changed: ok.length, skipped: users.length - ok.length };
};
export const createAdminAccount = async (aid, { name, email, phone }) => {
  need(aid, 'users.create'); await delay(400); const st = getState();
  const cleanEmail = email.trim().toLowerCase();
  if (st.admins.some((a) => a.email.toLowerCase() === cleanEmail)) throw new Error('An administrator with this email already exists.');
  const id = `adm-${String(st.admins.length + 1).padStart(2, '0')}`;
  const adminId = `ADM-${String(st.admins.length + 1).padStart(3, '0')}`;
  const newAdmin = { id, adminId, name: name.trim(), email: cleanEmail, phone: phone?.trim() || null, role: 'admin', status: 'Active', photoUrl: null, lastLogin: null, createdAt: Date.now() };
  mutate((s) => { s.admins.push(newAdmin); });
  audit(aid, { action: 'admin.created', category: 'Admin Management', description: `Created new Administrator account for ${name} (${cleanEmail})`, related: { type: 'admin', id, label: name } });
  return newAdmin;
};
export const changeAdminRole = async (aid, adminId, role) => {
  throw new Error('All administrators share the unified ADMIN role. Role switching is disabled.');
};
export const loginHistory = (u) => Array.from({ length: 4 }, (_, i) => ({ at: (u.lastLogin ?? 0) - i * 86400000 * 2, ip: `10.0.${(u.name.length * 7 + i) % 200}.${(i * 37 + 11) % 250}`, device: ['Chrome · Windows', 'Safari · iPhone', 'Chrome · Android', 'Edge · Windows'][i % 4] })).filter((h) => u.lastLogin && h.at > 0);
export const getUser = (aid, key) => { need(aid, 'users.view'); return all().find((u) => u.key === key) ?? null; };

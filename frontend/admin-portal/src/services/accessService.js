/**
 * Mock permission layer. In production the backend verifies the Supabase token, loads the admin's role & permissions,
 * and enforces them on EVERY endpoint. These checks mirror that so UI + services behave consistently.
 */
import { getState, mutate, uid, now } from './store';
import { roleDefs, defaultRolePermissions } from '../config/permissions';

export class PermissionError extends Error { constructor(m = 'You do not have permission to do this.') { super(m); this.name = 'PermissionError'; } }

export const getAdmin = (aid) => {
  const mock = getState().admins.find((a) => a.id === aid);
  if (mock) return mock;

  try {
    const raw = sessionStorage.getItem('maatram_admin_profile') || localStorage.getItem('maatram_admin_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.profile && (u.id === aid || u.profile.id === aid || u.profile.adminId === aid)) {
        return {
          id: aid,
          adminId: u.profile.adminId,
          name: u.profile.name || u.email,
          email: u.email,
          role: 'admin',
          status: 'Active',
          roleLabel: u.profile.roleLabel || 'Admin',
          permissions: u.profile.permissions || defaultRolePermissions.admin,
        };
      }
    }
  } catch {
    // ignore
  }

  return null;
};

export const permissionsOf = (aid) => {
  const a = getAdmin(aid);
  if (!a || a.status !== 'Active') return new Set();
  
  // Single ADMIN role has complete system-wide access across all permissions
  if (a.role === 'admin' || a.role === 'ADMIN') {
    return new Set(defaultRolePermissions.admin);
  }

  const set = new Set(getState().roles[a.role] ?? []);
  roleDefs.find((r) => r.id === a.role)?.lockedPerms?.forEach((k) => set.add(k));
  return set;
};
export const can = (aid, key) => permissionsOf(aid).has(key);
export const need = (aid, key) => { if (!getAdmin(aid)) throw new PermissionError('Not signed in.'); if (!can(aid, key)) throw new PermissionError(`Missing permission: ${key}`); };

/** Append-only audit entry. Never include passwords or tokens. */
export const audit = (aid, { action, category, description, zoneId = null, related = null }) => {
  const a = getAdmin(aid);
  mutate((s) => { s.auditLogs.push({ id: `LOG-${String(s.auditLogs.length + 1).padStart(5, '0')}`, actorId: a.id, actorName: a.name, actorRole: a.role, action, category, description, at: now(), zoneId, related }); });
};
export const uidOf = uid;

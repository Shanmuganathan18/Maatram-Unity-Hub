import { getState, mutate, delay, now } from './store';
import { need, audit, getAdmin } from './accessService';
import { roleDefs, allPermissions, defaultRolePermissions, roleLabel } from '../config/permissions';

export const listRoles = (aid) => {
  need(aid, 'roles.view');
  const st = getState();
  return roleDefs.map((r) => ({
    ...r,
    permissionCount: r.id === 'admin' ? permissionsOfRole('admin').size : null,
    members:
      r.id === 'zone_officer'
        ? st.officers.length
        : r.id === 'student'
        ? st.students.length
        : st.admins.length,
  }));
};

export const permissionsOfRole = (role) => {
  if (role === 'admin') {
    return new Set(getState().roles?.admin ?? defaultRolePermissions.admin ?? allPermissions.map((p) => p.key));
  }
  return new Set();
};

export const getPermissionHistory = (aid) => {
  need(aid, 'roles.view');
  return [...(getState().permissionHistory || [])].sort((a, b) => b.at - a.at);
};

export const isLocked = (role, key) => {
  return '';
};

/** An Admin holding roles.manage may review and update permissions. `changes` = [{role,key,value}] */
export const savePermissionChanges = async (aid, changes, note) => {
  need(aid, 'roles.manage');
  await delay(500);
  if (!changes.length) throw new Error('No changes to save.');
  if (!note?.trim()) throw new Error('Add a short reason for the change.');

  mutate((s) => {
    if (!s.roles) s.roles = {};
    if (!s.roles.admin) s.roles.admin = [...defaultRolePermissions.admin];
    const set = new Set(s.roles.admin);
    changes.forEach((c) => {
      c.value ? set.add(c.key) : set.delete(c.key);
    });
    s.roles.admin = [...set];

    if (!s.permissionHistory) s.permissionHistory = [];
    s.permissionHistory.push({
      id: `ph-${s.permissionHistory.length + 1}`,
      at: now(),
      actorName: getAdmin(aid)?.name || 'Administrator',
      role: 'Admin',
      change: changes.map((c) => `${c.value ? '+' : '−'}${c.key} (Admin)`).join(', '),
      note,
    });
  });

  audit(aid, {
    action: 'permission.changed',
    category: 'Role',
    description: `Changed ${changes.length} permission(s) for unified ADMIN role`,
    related: { type: 'role', id: 'admin', label: 'Admin' },
  });

  return changes.length;
};

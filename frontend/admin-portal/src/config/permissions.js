/**
 * MOCK role/permission catalogue. Real roles & permissions must be confirmed by the client and enforced by the backend.
 * Frontend checks only decide what the UI shows – they are NOT security.
 */
export const permissionGroups = [
  { id: 'users', label: 'User Management', perms: [['users.view', 'View users'], ['users.create', 'Create users'], ['users.edit', 'Edit users'], ['users.toggle', 'Activate / deactivate users'], ['users.assign_roles', 'Assign roles']] },
  { id: 'officers', label: 'Officer Management', perms: [['officers.view', 'View officers'], ['officers.create', 'Create officers'], ['officers.edit', 'Edit officers'], ['officers.toggle', 'Activate / deactivate officers'], ['officers.reassign', 'Reassign officer zone']] },
  { id: 'zones', label: 'Zone Management', perms: [['zones.view', 'View zones'], ['zones.create', 'Create zones'], ['zones.edit', 'Edit zones'], ['zones.deactivate', 'Deactivate / archive zones']] },
  { id: 'institutions', label: 'Institution Management', perms: [['institutions.view', 'View institutions'], ['institutions.create', 'Create institutions'], ['institutions.edit', 'Edit institutions'], ['institutions.deactivate', 'Deactivate institutions']] },
  { id: 'students', label: 'Student Management', perms: [['students.view', 'View students'], ['students.edit', 'Edit approved fields / mapping'], ['students.import', 'Import students'], ['students.toggle', 'Activate / deactivate accounts'], ['students.export', 'Export personal student data']] },
  { id: 'availability', label: 'Availability', perms: [['availability.view', 'View system availability']] },
  { id: 'events', label: 'Event Management', perms: [['events.view', 'View events'], ['events.approve', 'Approve events (if enabled)'], ['events.reject', 'Reject / request changes (if enabled)'], ['events.postpone', 'Postpone events'], ['events.cancel', 'Cancel events']] },
  { id: 'attendance', label: 'Attendance', perms: [['attendance.view', 'View attendance'], ['attendance.override', 'Override officer-recorded attendance']] },
  { id: 'reports', label: 'Reports & Data', perms: [['reports.view', 'View reports'], ['reports.export', 'Export reports'], ['data.view', 'View import / export centre']] },
  { id: 'audit', label: 'Audit Logs', perms: [['audit.view', 'View audit logs'], ['audit.export', 'Export audit logs']] },
  { id: 'comms', label: 'Announcements & Support', perms: [['announcements.view', 'View announcements'], ['announcements.manage', 'Create / publish announcements'], ['announcements.send_all', 'Announce to all users / all students'], ['support.view', 'View support tickets'], ['support.manage', 'Manage support tickets']] },
  { id: 'settings', label: 'System Settings', perms: [['settings.view', 'View settings'], ['settings.edit', 'Edit settings']] },
  { id: 'roles', label: 'Roles & Permissions', perms: [['roles.view', 'View roles & permissions'], ['roles.manage', 'Manage roles & permissions']] },
];
export const allPermissions = permissionGroups.flatMap((g) => g.perms.map(([key, label]) => ({ key, label, group: g.label })));
export const permLabel = (k) => allPermissions.find((p) => p.key === k)?.label ?? k;

const all = allPermissions.map((p) => p.key);
const views = all.filter((k) => k.endsWith('.view'));
export const defaultRolePermissions = {
  admin: all, // Single ADMIN role has complete system-wide access across all permissions
};
export const roleDefs = [
  { id: 'admin', label: 'Admin', description: 'Complete system-wide administrative access across all zones and records.', editable: false, lockedPerms: [] },
  { id: 'zone_officer', label: 'Zone Officer', description: 'Manages one assigned zone in the Officer Portal. Permissions are defined in that portal.', editable: false, caps: ['Monitor student availability in own zone', 'Create and manage events in own zone', 'Track responses and attendance', 'Generate zone-level reports'] },
  { id: 'student', label: 'Student', description: 'Uses the Student Portal. Permissions are defined in that portal.', editable: false, caps: ['Submit weekly availability', 'View and respond to invitations', 'View own participation history', 'Manage own profile'] },
];
export const adminRoleIds = ['admin'];
export const roleLabel = (id) => roleDefs.find((r) => r.id === id)?.label ?? id;

// MOCK authentication – replace with Supabase Auth. The backend must return role + permissions after verifying the token.
import { getState, mutate, delay, now } from './store';
import { appConfig } from '../config/appConfig';
import { audit, getAdmin, permissionsOf } from './accessService';
import { roleLabel } from '../config/permissions';

export const login = async (email, password) => {
  await delay(700);
  const a = getState().admins.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!a || password !== appConfig.demo.password) throw new Error('Email or password is incorrect.');
  if (a.status !== 'Active') throw new Error('This account is not active. Contact a Super Admin.');
  mutate((s) => { s.admins.find((x) => x.id === a.id).lastLogin = now(); });
  audit(a.id, { action: 'login', category: 'Login', description: 'Signed in' });
  return a.id;
};
export const logoutAudit = (aid) => { if (getAdmin(aid)) audit(aid, { action: 'logout', category: 'Login', description: 'Signed out' }); };
export const listDemoAdmins = () => getState().admins.map((a) => ({ id: a.id, name: a.name, email: a.email, roleLabel: roleLabel(a.role) }));
export const getAdminProfile = (aid) => {
  const a = getAdmin(aid);
  if (a) {
    return { ...a, roleLabel: roleLabel(a.role), permissions: permissionsOf(aid) };
  }
  try {
    const raw = sessionStorage.getItem('maatram_admin_profile') || localStorage.getItem('maatram_admin_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.id === aid || u.profile?.id === aid) {
        return {
          id: aid,
          name: u.profile?.name || u.name || 'Administrator',
          email: u.email,
          role: u.role || 'SUPER_ADMIN',
          roleLabel: roleLabel(u.role || 'SUPER_ADMIN'),
          status: 'Active',
          mustChangePassword: Boolean(u.mustChangePassword),
          permissions: u.permissions || permissionsOf('adm-1'),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
};
export const updateAdminProfile = async (aid, { phone, photoUrl }) => { await delay(300); if (!getAdmin(aid)) throw new Error('Not signed in.'); mutate((s) => Object.assign(s.admins.find((x) => x.id === aid), { phone, photoUrl })); audit(aid, { action: 'profile.updated', category: 'User', description: 'Updated own contact details' }); };
export const getPreferences = (aid) => ({ inApp: true, email: false, sms: false, whatsapp: false, ...(getAdmin(aid)?.prefs ?? {}) });
export const savePreferences = async (aid, prefs) => { await delay(300); mutate((s) => { s.admins.find((x) => x.id === aid).prefs = { ...prefs, inApp: true }; }); audit(aid, { action: 'profile.updated', category: 'User', description: 'Updated notification preferences' }); };

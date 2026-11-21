// MOCK authentication. Replace with Supabase Auth; the backend then maps the verified token to the officer + zone.
import { getState, delay } from './store';
import { appConfig } from '../config/appConfig';

export const login = async (email, password) => {
  await delay(700);
  const o = getState().officers.find((x) => x.email.toLowerCase() === email.trim().toLowerCase());
  if (!o || password !== appConfig.demo.password) throw new Error('Email or password is incorrect.');
  if (o.status !== 'Active') throw new Error('This account is not active. Contact your administrator.');
  return o.id;
};
export const listDemoOfficers = () => getState().officers.map((o) => ({ id: o.id, name: o.name, email: o.email, zone: getState().zones.find((z) => z.id === o.zoneId)?.name }));
export const getOfficerProfile = (oid) => {
  const o = getState().officers.find((x) => x.id === oid);
  if (o) {
    const z = getState().zones.find((x) => x.id === o.zoneId);
    return { ...o, zone: z?.name, zoneRegion: z?.region, zoneLabel: z ? `${z.name} • ${z.region}` : '' };
  }
  try {
    const raw = sessionStorage.getItem('maatram_officer_profile') || localStorage.getItem('maatram_officer_profile');
    if (raw) {
      const u = JSON.parse(raw);
      if (u.profile && (u.id === oid || u.profile.id === oid || u.profile.officerId === oid)) {
        return {
          id: oid,
          officerId: u.profile.officerId,
          name: u.profile.name,
          email: u.email,
          phone: u.profile.phone || '',
          designation: u.profile.designation || 'Zonal Officer',
          photoUrl: u.profile.photoUrl || '',
          zoneId: u.profile.zone?.id,
          zone: u.profile.zone?.name || 'Assigned Zone',
          zoneRegion: u.profile.zone?.region || '',
          zoneLabel: u.profile.zone ? `${u.profile.zone.name}${u.profile.zone.region ? ` • ${u.profile.zone.region}` : ''}` : 'Assigned Zone',
          status: 'Active',
          mustChangePassword: Boolean(u.mustChangePassword),
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
};

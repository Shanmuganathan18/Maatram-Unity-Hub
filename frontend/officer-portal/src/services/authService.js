// Authentication and profile hydration for Officer Portal.
import { getState, delay, mutate } from './store';
import { appConfig } from '../config/appConfig';

export const login = async (email, password) => {
  await delay(700);
  const o = getState().officers.find((x) => x.email?.toLowerCase() === email.trim().toLowerCase());
  if (!o || password !== appConfig.demo.password) throw new Error('Email or password is incorrect.');
  if (o.status !== 'Active') throw new Error('This account is not active. Contact your administrator.');
  return o.id;
};

export const listDemoOfficers = () =>
  getState().officers.map((o) => ({
    id: o.id,
    name: o.name,
    email: o.email,
    zone: getState().zones.find((z) => z.id === o.zoneId)?.name,
  }));

export const getOfficerProfile = (oid) => {
  if (!oid) return null;

  // 1. Check existing officer in store
  const o = getState().officers.find((x) => x.id === oid || x.officerId === oid);
  if (o) {
    const z = getState().zones.find((x) => x.id === o.zoneId);
    return {
      ...o,
      zone: z?.name || o.zone || 'Assigned Zone',
      zoneRegion: z?.region || o.zoneRegion || '',
      zoneLabel: z ? `${z.name} • ${z.region}` : (o.zoneLabel || o.zone || 'Assigned Zone'),
    };
  }

  // 2. Check storage for authenticated officer profile
  try {
    const raw = sessionStorage.getItem('maatram_officer_profile') || localStorage.getItem('maatram_officer_profile');
    if (raw) {
      const u = JSON.parse(raw);
      const prof = u.profile || u.officerProfile || u;
      const uid = u.id || prof.id || prof.officerId;

      if (uid === oid || prof.id === oid || prof.officerId === oid || !oid) {
        const zoneObj = prof.zone || null;
        const zoneId = zoneObj?.id || prof.zoneId || null;
        const zInStore = zoneId ? getState().zones.find((z) => z.id === zoneId) : null;

        const zoneName = zoneObj?.name || zInStore?.name || prof.zone || 'Assigned Zone';
        const zoneRegion = zoneObj?.region || zInStore?.region || prof.zoneRegion || '';
        const zoneLabel = zoneRegion ? `${zoneName} • ${zoneRegion}` : zoneName;

        const resolved = {
          id: prof.id || u.id || oid,
          officerId: prof.officerId || 'OFF-A-003',
          name: prof.name || (u.email ? u.email.split('@')[0] : 'Zone Officer'),
          email: u.email || prof.email || '',
          phone: prof.phone || '',
          designation: prof.designation || 'Zonal Officer',
          photoUrl: prof.photoUrl || '',
          zoneId,
          zone: zoneName,
          zoneRegion,
          zoneLabel,
          status: 'Active',
          mustChangePassword: Boolean(u.mustChangePassword),
        };

        // Cache into in-memory store so all zoneScopeService queries find this officer
        mutate((s) => {
          if (!s.officers.some((x) => x.id === resolved.id || x.officerId === resolved.officerId)) {
            s.officers.push(resolved);
          }
        });

        return resolved;
      }
    }
  } catch (err) {
    console.warn('Failed to parse officer profile from storage:', err);
  }

  // 3. Fallback mock officer so rendering never crashes
  const fallback = getState().officers[0];
  if (fallback) {
    const z = getState().zones.find((x) => x.id === fallback.zoneId);
    return {
      ...fallback,
      zone: z?.name || 'Zone A',
      zoneRegion: z?.region || 'Chennai',
      zoneLabel: z ? `${z.name} • ${z.region}` : 'Zone A • Chennai',
    };
  }

  return null;
};

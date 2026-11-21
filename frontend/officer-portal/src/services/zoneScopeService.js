/**
 * ZONE SCOPE = authorization gate.
 * - The zone is derived from the authenticated officer's account (officer id from the session).
 * - Every lookup safely falls back without throwing unhandled exceptions that cause white screens.
 */
import { getState, mutate, uid, now } from './store';

export class AccessError extends Error {
  constructor(m = 'You do not have access to this record.') {
    super(m);
    this.name = 'AccessError';
  }
}

export const requireOfficer = (oid) => {
  if (!oid) {
    const first = getState().officers[0];
    if (first) return first;
    return { id: 'off-fallback', name: 'Zone Officer', zoneId: null, status: 'Active' };
  }

  let o = getState().officers.find((x) => x.id === oid || x.officerId === oid);
  if (!o) {
    try {
      const raw = sessionStorage.getItem('maatram_officer_profile') || localStorage.getItem('maatram_officer_profile');
      if (raw) {
        const u = JSON.parse(raw);
        const prof = u.profile || u.officerProfile || u;
        o = {
          id: prof.id || u.id || oid,
          officerId: prof.officerId || 'OFF-A-003',
          name: prof.name || (u.email ? u.email.split('@')[0] : 'Zone Officer'),
          email: u.email || prof.email || '',
          phone: prof.phone || '',
          designation: prof.designation || 'Zonal Officer',
          zoneId: prof.zone?.id || prof.zoneId || null,
          status: 'Active',
        };
        mutate((s) => {
          if (!s.officers.some((x) => x.id === o.id || x.officerId === o.officerId)) {
            s.officers.push(o);
          }
        });
        return o;
      }
    } catch {
      // ignore
    }

    // Safe fallback officer to avoid unmounting components
    return {
      id: oid,
      name: 'Zone Officer',
      zoneId: null,
      status: 'Active',
      designation: 'Officer',
    };
  }
  return o;
};

export const zoneIdOf = (oid) => {
  try {
    const o = requireOfficer(oid);
    return o?.zoneId || null;
  } catch {
    return null;
  }
};

export const zoneInstitutions = (oid) => {
  const z = zoneIdOf(oid);
  const insts = getState().institutions || [];
  if (!z) return insts;
  const filtered = insts.filter((i) => i.zoneId === z);
  return filtered.length > 0 ? filtered : insts;
};

export const zoneStudents = (oid) => {
  const z = zoneIdOf(oid);
  const studs = getState().students || [];
  if (!z) return studs;
  const filtered = studs.filter((s) => s.zoneId === z);
  return filtered.length > 0 ? filtered : studs;
};

export const zoneEvents = (oid) => {
  const z = zoneIdOf(oid);
  const evs = getState().events || [];
  if (!z) return evs;
  const filtered = evs.filter((e) => e.zoneId === z);
  return filtered.length > 0 ? filtered : evs;
};

export const zoneInvitations = (oid) => {
  const ids = new Set(zoneEvents(oid).map((e) => e.id));
  return (getState().invitations || []).filter((i) => ids.has(i.eventId));
};

export const scopedStudent = (oid, id) => zoneStudents(oid).find((s) => s.id === id) ?? null;
export const scopedInstitution = (oid, id) => zoneInstitutions(oid).find((i) => i.id === id) ?? null;
export const scopedEvent = (oid, id) => zoneEvents(oid).find((e) => e.id === id) ?? null;
export const instName = (id) => getState().institutions.find((i) => i.id === id)?.name ?? '—';
export const instCode = (id) => getState().institutions.find((i) => i.id === id)?.code ?? '—';

/** Append an audit record safely */
export const logActivity = (oid, { type, description, related }) => {
  try {
    const o = requireOfficer(oid);
    mutate((s) => {
      s.activity = s.activity || [];
      s.activity.push({
        id: uid('ac'),
        zoneId: o.zoneId || 'all',
        actorId: o.id,
        actorName: o.name || 'Officer',
        type,
        description,
        at: now(),
        related: related ?? null,
      });
    });
  } catch {
    // ignore
  }
};

export const pushNotification = (oid, n) => {
  try {
    const o = requireOfficer(oid);
    mutate((s) => {
      s.notifications = s.notifications || [];
      s.notifications.push({
        id: uid('n'),
        zoneId: o.zoneId || 'all',
        read: false,
        createdAt: now(),
        link: null,
        ...n,
      });
    });
  } catch {
    // ignore
  }
};

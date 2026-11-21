import { getState } from './store';
import { can } from './accessService';
import { zoneShort, instName } from './metrics';

/** Returns only categories the current admin may view (mirror of backend-enforced search). */
export const globalSearch = (aid, q) => {
  const n = q.trim().toLowerCase(); if (n.length < 2) return [];
  const st = getState(); const has = (...s) => s.join(' ').toLowerCase().includes(n); const out = [];
  const add = (type, perm, label, items) => { if (can(aid, perm) && items.length) out.push({ type, label, items: items.slice(0, 5) }); };
  add('zones', 'zones.view', 'Zones', st.zones.filter((z) => has(z.name, z.code, z.region)).map((z) => ({ id: z.id, title: `${z.name} • ${z.region}`, sub: z.code, to: `/zones/${z.id}` })));
  add('officers', 'officers.view', 'Officers', st.officers.filter((o) => has(o.name, o.email, o.officerId)).map((o) => ({ id: o.id, title: o.name, sub: `${o.officerId} · ${o.zoneId ? zoneShort(o.zoneId) : 'Unassigned'}`, to: `/officers/${o.id}` })));
  add('institutions', 'institutions.view', 'Institutions', st.institutions.filter((i) => has(i.name, i.code)).map((i) => ({ id: i.id, title: i.name, sub: `${i.code} · ${zoneShort(i.zoneId)}`, to: `/institutions/${i.id}` })));
  add('students', 'students.view', 'Students', st.students.filter((s) => has(s.name, s.studentId, s.email)).map((s) => ({ id: s.id, title: s.name, sub: `${s.studentId} · ${instName(s.institutionId)}`, to: `/students/${s.id}` })));
  add('events', 'events.view', 'Events', st.events.filter((e) => has(e.title, e.id)).map((e) => ({ id: e.id, title: e.title, sub: `${zoneShort(e.zoneId)} · ${e.date}`, to: `/events/${e.id}` })));
  add('tickets', 'support.view', 'Support tickets', st.tickets.filter((t) => has(t.id, t.subject, t.submittedBy)).map((t) => ({ id: t.id, title: `${t.id} · ${t.subject}`, sub: t.status, to: `/support?q=${t.id}` })));
  return out;
};

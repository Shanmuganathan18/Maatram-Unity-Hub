import { getState } from './store';
import { need } from './accessService';

/** Detects problems only – never modifies records. */
export const getDataQuality = (aid) => {
  need(aid, 'students.view'); const st = getState(); const out = [];
  const add = (id, severity, title, items, link) => items.length && out.push({ id, severity, title, count: items.length, items: items.slice(0, 6), link });
  const dup = (list, key) => { const m = new Map(); list.forEach((x) => m.set(x[key], [...(m.get(x[key]) ?? []), x])); return [...m.values()].filter((v) => v.length > 1).flat(); };
  add('dup-student', 'high', 'Duplicate student IDs', dup(st.students, 'studentId').map((s) => ({ label: `${s.studentId} – ${s.name}`, link: `/students/${s.id}` })), '/students');
  add('dup-inst', 'medium', 'Duplicate institution codes', dup(st.institutions, 'code').map((i) => ({ label: `${i.code} – ${i.name}`, link: `/institutions/${i.id}` })), '/institutions');
  add('bad-email', 'medium', 'Invalid student email formats', st.students.filter((s) => s.email && !/^\S+@\S+\.\S+$/.test(s.email)).map((s) => ({ label: `${s.name}: “${s.email}”`, link: `/students/${s.id}` })), '/students');
  add('missing-details', 'medium', 'Students with missing contact details', st.students.filter((s) => !s.email || !s.phone).map((s) => ({ label: `${s.name} (${s.studentId})`, link: `/students/${s.id}` })), '/students');
  add('inst-no-zone', 'high', 'Institutions without an assigned zone', st.institutions.filter((i) => !i.zoneId).map((i) => ({ label: i.name, link: `/institutions/${i.id}` })), '/institutions?zone=none');
  add('inst-incomplete', 'low', 'Institutions with incomplete contact information', st.institutions.filter((i) => !i.contactEmail || !i.contactPhone || !i.contactName).map((i) => ({ label: i.name, link: `/institutions/${i.id}` })), '/institutions');
  add('off-no-zone', 'medium', 'Officers without a zone assignment', st.officers.filter((o) => !o.zoneId).map((o) => ({ label: o.name, link: `/officers/${o.id}` })), '/officers?zone=none');
  add('zone-no-officer', 'medium', 'Active zones without an officer', st.zones.filter((z) => z.status === 'Active' && !st.officers.some((o) => o.zoneId === z.id && o.status === 'Active')).map((z) => ({ label: `${z.name} • ${z.region}`, link: `/zones/${z.id}` })), '/zones');
  return out;
};

import { getState, mutate, delay, now, uid } from './store';
import { need, audit } from './accessService';
import { filterStudents, instName, zoneName, defaultWeek, weekInfo, weekOptions } from './metrics';
import { weekDays } from '../utils/dates';

const weekStatus = (rec, info) => (rec?.status === 'submitted' ? 'submitted' : rec?.status === 'draft' && info.open ? 'draft' : info.open ? 'not_submitted' : (getState().settings.availability.systemAssumedUnavailable ? 'system_assumed_unavailable' : 'not_submitted'));

export const listStudents = (aid, { q = '', zoneId = '', institutionId = '', department = '', year = '', status = '', availability = '', sortKey = 'name', sortDir = 'asc', page = 1, pageSize = 12 } = {}) => {
  need(aid, 'students.view'); const ws = defaultWeek(); const info = weekInfo(ws); const n = q.trim().toLowerCase();
  let rows = filterStudents({ zoneId: zoneId === 'none' ? undefined : zoneId, institutionId, department, year, status }).filter((s) => zoneId !== 'none' || !s.zoneId)
    .map((s) => ({ ...s, institution: instName(s.institutionId), zoneLabel: s.zoneId ? zoneName(s.zoneId) : 'Unassigned', availabilityStatus: weekStatus(getState().availability[s.id]?.[ws], info) }))
    .filter((s) => (!n || `${s.name} ${s.studentId} ${s.email}`.toLowerCase().includes(n)) && (!availability || s.availabilityStatus === availability));
  const dir = sortDir === 'desc' ? -1 : 1; const get = { name: (s) => s.name, id: (s) => s.studentId, institution: (s) => s.institution, zone: (s) => s.zoneLabel, year: (s) => s.year }[sortKey] ?? ((s) => s.name);
  rows.sort((a, b) => { const x = get(a), y = get(b); return (typeof x === 'number' ? x - y : String(x).localeCompare(String(y))) * dir || a.name.localeCompare(b.name); });
  const total = rows.length; const pages = Math.max(1, Math.ceil(total / pageSize)); const p = Math.min(page, pages);
  return { rows: rows.slice((p - 1) * pageSize, p * pageSize), all: rows, total, page: p, pages };
};
export const studentFilterOptions = () => { const st = getState(); return { zones: st.zones.map((z) => ({ value: z.id, label: `${z.name} • ${z.region}` })), institutions: st.institutions.map((i) => ({ value: i.id, label: i.name, zoneId: i.zoneId })), departments: [...new Set(st.students.map((s) => s.department))].sort() }; };

export const getStudentDetail = (aid, id) => {
  need(aid, 'students.view'); const st = getState(); const s = st.students.find((x) => x.id === id); if (!s) return null;
  const weeks = weekOptions().slice().reverse().map((ws) => { const info = weekInfo(ws); const rec = st.availability[s.id]?.[ws] ?? null; const days = weekDays(ws).map((d) => ({ date: d, state: rec?.status === 'submitted' ? (rec.days[d] === 'none' ? 'not_selected' : rec.days[d]) : rec?.status === 'draft' && info.open ? 'draft' : weekStatus(null, info) })); return { weekStart: ws, status: weekStatus(rec, info), locked: info.locked, days, available: days.filter((d) => d.state === 'available').length, unavailable: days.filter((d) => d.state === 'unavailable').length, submittedAt: rec?.submittedAt ?? null }; });
  const invitations = st.invitations.filter((i) => i.studentId === id).map((i) => ({ ...i, event: st.events.find((e) => e.id === i.eventId) })).sort((a, b) => b.event.date.localeCompare(a.event.date));
  const acc = invitations.filter((i) => i.response === 'accepted').length;
  return { student: { ...s, institution: instName(s.institutionId), zoneLabel: s.zoneId ? zoneName(s.zoneId) : 'Unassigned' }, weeks, invitations, summary: { invited: invitations.length, accepted: acc, present: invitations.filter((i) => i.attendance === 'present').length }, history: st.auditLogs.filter((a) => a.related?.id === id).sort((a, b) => b.at - a.at) };
};

const emailOk = (e) => /^\S+@\S+\.\S+$/.test(e ?? '');
/** Only approved fields: email, phone, department, year. Name/ID/institution are corrected via dedicated workflows. */
export const updateStudent = async (aid, id, d) => {
  need(aid, 'students.edit'); await delay(350); const e = [];
  if (!emailOk(d.email)) e.push('Enter a valid email address.'); if (d.phone && !/^[6-9]\d{9}$/.test(d.phone)) e.push('Phone must be a 10-digit mobile number.'); if (!d.department) e.push('Department is required.'); if (!(Number(d.year) >= 1 && Number(d.year) <= 4)) e.push('Year must be 1–4.');
  if (e.length) throw new Error(e.join(' '));
  const s = getState().students.find((x) => x.id === id);
  mutate((st) => Object.assign(st.students.find((x) => x.id === id), { email: d.email.trim(), phone: d.phone, department: d.department, year: Number(d.year) }));
  audit(aid, { action: 'student.updated', category: 'Student', description: `Updated approved fields of ${s.studentId}`, zoneId: s.zoneId, related: { type: 'student', id, label: s.name } });
};
export const setStudentStatus = async (aid, id, status) => { need(aid, 'students.toggle'); await delay(300); const s = getState().students.find((x) => x.id === id); mutate((st) => { st.students.find((x) => x.id === id).status = status; }); audit(aid, { action: 'student.status_changed', category: 'Student', description: `Set ${s.studentId} to ${status}`, zoneId: s.zoneId, related: { type: 'student', id, label: s.name } }); };
export const bulkSetStatus = async (aid, ids, status) => {
  need(aid, 'students.toggle'); await delay(500); if (!ids.length) throw new Error('No students selected.');
  mutate((st) => st.students.forEach((s) => { if (ids.includes(s.id)) s.status = status; }));
  audit(aid, { action: 'student.bulk_status', category: 'Student', description: `Bulk set ${ids.length} student(s) to ${status}` }); return ids.length;
};
/** Zone follows the institution (the approved institution-assignment process). Never set directly. */
export const remapInstitution = async (aid, ids, institutionId) => {
  need(aid, 'students.edit'); await delay(500); const inst = getState().institutions.find((i) => i.id === institutionId);
  if (!inst?.zoneId) throw new Error('The target institution has no zone. Assign a zone to the institution first.'); if (!ids.length) throw new Error('No students selected.');
  mutate((st) => st.students.forEach((s) => { if (ids.includes(s.id)) { s.institutionId = institutionId; s.zoneId = inst.zoneId; } }));
  audit(aid, { action: 'student.remapped', category: 'Student', description: `Mapped ${ids.length} student(s) to ${inst.name} (${zoneName(inst.zoneId)})`, zoneId: inst.zoneId, related: { type: 'institution', id: institutionId, label: inst.name } }); return ids.length;
};

// ---- bulk import: validate + simulate. NOTHING is written to the student table. ----
const REQ = ['studentId', 'name', 'email', 'institutionCode', 'department', 'year'];
const parseLine = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };
export const validateImport = (aid, text, fileName = 'upload.csv') => {
  need(aid, 'students.import'); const st = getState(); const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { fileName, rows: 0, valid: 0, invalid: 0, errors: [], items: [], fatal: 'The file has no data rows.' };
  const head = parseLine(lines[0]); const miss = REQ.filter((c) => !head.includes(c)); if (miss.length) return { fileName, rows: lines.length - 1, valid: 0, invalid: 0, errors: [], items: [], fatal: `Missing required column(s): ${miss.join(', ')}.` };
  const existing = new Set(st.students.map((s) => s.studentId)); const seen = new Set(); const errors = []; const items = [];
  lines.slice(1).forEach((l, idx) => {
    const c = parseLine(l); const v = Object.fromEntries(head.map((h, i) => [h, c[i] ?? ''])); const row = idx + 2; const errs = [];
    REQ.forEach((k) => { if (!v[k]) errs.push(`${k} is required`); });
    if (v.studentId && (existing.has(v.studentId) || seen.has(v.studentId))) errs.push(`duplicate student ID ${v.studentId}`);
    if (v.email && !emailOk(v.email)) errs.push(`invalid email “${v.email}”`);
    if (v.year && !/^[1-4]$/.test(v.year)) errs.push('year must be 1–4');
    const insts = st.institutions.filter((i) => i.code === v.institutionCode);
    if (v.institutionCode) { if (insts.length === 0) errs.push(`institution code “${v.institutionCode}” not found`); else if (insts.length > 1) errs.push(`institution code “${v.institutionCode}” is ambiguous (${insts.length} institutions)`); else { const i = insts[0]; if (!i.zoneId) errs.push('institution has no zone'); else if (st.zones.find((z) => z.id === i.zoneId)?.status !== 'Active') errs.push('institution’s zone is not active'); if (v.zoneCode && i.zoneId && st.zones.find((z) => z.id === i.zoneId)?.code !== v.zoneCode) errs.push(`zoneCode ${v.zoneCode} does not match the institution’s zone`); if (v.department && i.departments.length && !i.departments.includes(v.department)) errs.push(`department “${v.department}” not offered by this institution`); } }
    seen.add(v.studentId); errs.forEach((m) => errors.push({ row, studentId: v.studentId, message: m })); items.push({ row, ...v, ok: errs.length === 0, problems: errs });
  });
  const invalid = items.filter((i) => !i.ok).length; return { fileName, rows: items.length, valid: items.length - invalid, invalid, errors, items };
};
export const errorReportCsv = (result) => ['row,studentId,problem', ...result.errors.map((e) => `${e.row},"${e.studentId}","${e.message.replace(/"/g, '""')}"`)].join('\r\n');
/** Simulated confirmation: records an import-history entry only. */
export const confirmImportSimulated = async (aid, result) => {
  need(aid, 'students.import'); await delay(600);
  mutate((s) => s.imports.unshift({ id: uid('imp'), fileName: result.fileName, uploadedAt: now(), by: s.admins.find((a) => a.id === aid).name, rows: result.rows, valid: result.valid, invalid: result.invalid, status: result.invalid ? 'Previewed with errors (mock – nothing written)' : 'Previewed (mock – nothing written)' }));
  audit(aid, { action: 'student.import_previewed', category: 'Student', description: `Import preview confirmed (simulated) for ${result.fileName}: ${result.valid} valid, ${result.invalid} invalid` });
};

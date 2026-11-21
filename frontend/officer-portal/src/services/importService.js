import { zoneInstitutions, zoneStudents } from './zoneScopeService';
const REQ = ['studentId', 'name', 'email', 'institutionCode', 'department', 'year'];
const parseLine = (l) => { const out = []; let cur = '', q = false; for (const ch of l) { if (ch === '"') q = !q; else if (ch === ',' && !q) { out.push(cur.trim()); cur = ''; } else cur += ch; } out.push(cur.trim()); return out; };

/** Validation only – never writes data. Only zone institutions are valid mappings. */
export const validateImport = (oid, text) => {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return { rows: 0, valid: 0, errors: [], fatal: 'The file has no data rows.' };
  const head = parseLine(lines[0]); const miss = REQ.filter((c) => !head.includes(c));
  if (miss.length) return { rows: lines.length - 1, valid: 0, errors: [], fatal: `Missing required column(s): ${miss.join(', ')}.` };
  const codes = new Set(zoneInstitutions(oid).map((i) => i.code)); const existing = new Set(zoneStudents(oid).map((s) => s.studentId)); const seen = new Set();
  const errors = []; let valid = 0;
  lines.slice(1).forEach((l, idx) => {
    const v = Object.fromEntries(head.map((h, i) => [h, parseLine(l)[i] ?? ''])); const row = idx + 2; const e0 = errors.length;
    REQ.forEach((c) => { if (!v[c]) errors.push({ row, message: `${c} is required.` }); });
    if (v.studentId && (existing.has(v.studentId) || seen.has(v.studentId))) errors.push({ row, message: `Duplicate student ID ${v.studentId}.` });
    if (v.email && !/^\S+@\S+\.\S+$/.test(v.email)) errors.push({ row, message: `Invalid email “${v.email}”.` });
    if (v.institutionCode && !codes.has(v.institutionCode)) errors.push({ row, message: `Institution code “${v.institutionCode}” is not mapped to an institution in your zone.` });
    if (v.year && !/^[1-4]$/.test(v.year)) errors.push({ row, message: 'Year must be 1–4.' });
    seen.add(v.studentId); if (errors.length === e0) valid++;
  });
  return { rows: lines.length - 1, valid, errors };
};

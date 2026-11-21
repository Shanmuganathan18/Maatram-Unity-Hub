// CSV and Excel-compatible (.xls HTML table) generation. Always called with already zone-scoped rows.
const esc = (v) => String(v ?? '');
export const toCsv = (rows) => {
  if (!rows.length) return '';
  const cols = Object.keys(rows[0]);
  const q = (v) => `"${esc(v).replace(/"/g, '""')}"`;
  return [cols.map(q).join(','), ...rows.map((r) => cols.map((c) => q(r[c])).join(','))].join('\r\n');
};
export const toXls = (rows, sheet = 'Report') => {
  const cols = rows.length ? Object.keys(rows[0]) : [];
  const h = (s) => esc(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><title>${h(sheet)}</title></head><body><table border="1"><thead><tr>${cols.map((c) => `<th>${h(c)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${cols.map((c) => `<td>${h(r[c])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
};
export const buildFile = (rows, format, base) => format === 'xls'
  ? { filename: `${base}.xls`, content: toXls(rows, base), mime: 'application/vnd.ms-excel' }
  : { filename: `${base}.csv`, content: toCsv(rows), mime: 'text/csv;charset=utf-8' };
export const downloadFile = ({ filename, content, mime }) => {
  const url = URL.createObjectURL(new Blob([content], { type: mime }));
  const a = Object.assign(document.createElement('a'), { href: url, download: filename });
  document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
};

import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { Button } from './Button';
import { EmptyState } from './index';
import { cn } from '../../utils/cn';

export const StatCard = ({ icon: Icon, label, value, hint, to, tone = 'text-brand-700 bg-brand-50' }) => {
  const body = (<><span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tone)}><Icon className="h-5 w-5" aria-hidden /></span>
    <span className="min-w-0"><span className="block text-2xl font-extrabold text-navy">{value}</span><span className="block text-sm font-semibold text-ink">{label}</span>{hint && <span className="block truncate text-xs text-ink-mute">{hint}</span>}</span></>);
  return to ? <Link to={to} className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-pop">{body}</Link> : <div className="card flex items-center gap-3 p-4">{body}</div>;
};

export const SelectField = ({ label, value, onChange, options, all = 'All', id, className }) => (
  <div className={className}>
    <label htmlFor={id} className="label">{label}</label>
    <select id={id} className="field" value={value} onChange={(e) => onChange(e.target.value)}>
      {all !== null && <option value="">{all}</option>}
      {options.map((o) => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
    </select>
  </div>
);

export const SearchInput = ({ value, onChange, placeholder = 'Search…', label = 'Search', id = 'search', className }) => {
  const [v, setV] = useState(value);
  useEffect(() => setV(value), [value]);
  useEffect(() => { const t = setTimeout(() => v !== value && onChange(v), 250); return () => clearTimeout(t); }, [v]); // eslint-disable-line
  return (
    <div className={className}><label htmlFor={id} className="label">{label}</label>
      <div className="relative"><Search className="pointer-events-none absolute left-3 top-3 h-5 w-5 text-ink-mute" aria-hidden /><input id={id} type="search" className="field pl-10" placeholder={placeholder} value={v} onChange={(e) => setV(e.target.value)} /></div></div>
  );
};

export const FilterBar = ({ children, onClear, active }) => (
  <div className="card mb-4 p-4"><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    {onClear && <div className="mt-3 flex justify-end"><Button variant="ghost" size="sm" onClick={onClear} disabled={!active}>Clear filters</Button></div>}</div>
);

export const Tabs = ({ tabs, value, onChange, label }) => (
  <div role="tablist" aria-label={label} className="mb-4 flex flex-wrap gap-2">
    {tabs.map((t) => <button key={t.id} role="tab" aria-selected={value === t.id} onClick={() => onChange(t.id)} className={cn('min-h-[40px] rounded-pill border px-4 text-sm font-semibold', value === t.id ? 'border-navy bg-navy text-white' : 'border-lavender-300 bg-white text-navy hover:bg-lavender-50')}>{t.label}{t.count !== undefined && <span className="ml-1 opacity-70">({t.count})</span>}</button>)}
  </div>
);

export const Pagination = ({ page, pages, total, pageSize, onPage }) => (
  <div className="flex flex-wrap items-center justify-between gap-2 border-t border-lavender-200 px-4 py-3 text-sm text-ink-soft">
    <span>{total === 0 ? 'No results' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(total, page * pageSize)} of ${total}`}</span>
    <div className="flex items-center gap-2"><Button size="sm" variant="outline" disabled={page <= 1} onClick={() => onPage(page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button><span>Page {page} of {pages}</span><Button size="sm" variant="outline" disabled={page >= pages} onClick={() => onPage(page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button></div>
  </div>
);

/** Responsive table: real <table> at md+, stacked cards on phones (renderCard). */
export function DataTable({ columns, rows, rowKey = (r) => r.id, sort, onSort, renderCard, empty, selectable, selected, onSelect, caption }) {
  if (!rows.length) return empty ?? <EmptyState title="No records found" text="Try changing the search or filters." />;
  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead className="bg-lavender-100 text-xs uppercase text-ink-soft"><tr>
            {selectable && <th scope="col" className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all rows" className="h-4 w-4 accent-brand-700" checked={rows.length > 0 && rows.every((r) => selected.has(rowKey(r)))} onChange={(e) => onSelect(e.target.checked ? new Set(rows.map(rowKey)) : new Set())} /></th>}
            {columns.map((c) => <th key={c.key} scope="col" aria-sort={sort?.key === c.key ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined} className={cn('px-4 py-3', c.className)}>
              {c.sortable ? <button className="inline-flex items-center gap-1 font-bold uppercase" onClick={() => onSort(c.key)}>{c.label}{sort?.key === c.key && (sort.dir === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)}</button> : c.label}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-lavender-200">{rows.map((r) => (
            <tr key={rowKey(r)} className="hover:bg-lavender-50">
              {selectable && <td className="px-3 py-3"><input type="checkbox" aria-label="Select row" className="h-4 w-4 accent-brand-700" checked={selected.has(rowKey(r))} onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(rowKey(r)) : n.delete(rowKey(r)); onSelect(n); }} /></td>}
              {columns.map((c) => <td key={c.key} className={cn('px-4 py-3 align-middle', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}</tr>))}</tbody>
        </table>
      </div>
      <div className="space-y-3 p-3 md:hidden">{rows.map((r) => <div key={rowKey(r)} className="rounded-2xl border border-lavender-200 p-3">{selectable && <label className="mb-2 flex items-center gap-2 text-xs"><input type="checkbox" className="h-5 w-5 accent-brand-700" checked={selected.has(rowKey(r))} onChange={(e) => { const n = new Set(selected); e.target.checked ? n.add(rowKey(r)) : n.delete(rowKey(r)); onSelect(n); }} />Select</label>}{renderCard(r)}</div>)}</div>
    </>
  );
}

export const PendingTag = ({ children = 'Pending client confirmation' }) => <span className="inline-flex items-center rounded-pill border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-800">{children}</span>;

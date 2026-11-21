import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { toast } from 'sonner';
import { FileDown } from 'lucide-react';
import { Button, Card, CardHeader, EmptyState, FilterBar, Notice, PageHeader, Pagination, SelectField, Tabs } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import * as rep from '../services/reportService';
import { institutionOptions, departments } from '../services/availabilityService';
import { downloadFile } from '../utils/exportFiles';
import { appConfig, eventCategories, eventStatuses } from '../config/appConfig';

const tabs = [{ id: 'availability', label: 'Weekly availability' }, { id: 'events', label: 'Events' }, { id: 'institutions', label: 'Institutions' }, { id: 'participation', label: 'Participation' }];
const D = { from: '', to: '', institutionId: '', department: '', year: '', category: '', status: '' };
const C = ['#0f8a76', '#1f3763', '#f43f5e', '#f59e0b'];

export default function Reports() {
  usePageTitle('Reports & analytics');
  const { oid, officer } = useAuth(); const v = useStore();
  const [type, setType] = useState('availability'); const [f, setF] = useState(D); const [page, setPage] = useState(1); const [busy, setBusy] = useState('');
  const set = (p) => { setF((x) => ({ ...x, ...p })); setPage(1); };
  const rows = useMemo(() => rep.reportRows(oid, type, f), [oid, type, f, v]); // eslint-disable-line
  const part = type === 'participation' ? rep.participationReport(oid, f) : null;
  const cols = rows[0] ? Object.keys(rows[0]) : []; const pages = Math.max(1, Math.ceil(rows.length / 10)); const pg = Math.min(page, pages);
  const weekly = type === 'availability' ? Object.values(rows.reduce((m, r) => { (m[r.Week] ??= { week: r.Week.slice(5), sum: 0, n: 0 }); m[r.Week].sum += r['Submission rate %']; m[r.Week].n++; return m; }, {})).map((x) => ({ week: x.week, rate: Math.round(x.sum / x.n) })) : [];
  const exp = (fmt) => { try { setBusy(fmt); downloadFile(rep.exportReport(oid, type, f, fmt)); toast.success(`${fmt.toUpperCase()} downloaded (${rows.length} rows).`); } catch (e) { toast.error(e.message); } finally { setBusy(''); } };
  return (
    <>
      <PageHeader title="Reports & analytics" subtitle={`All reports and exports contain only ${officer.zoneLabel} data.`} actions={<><Button variant="secondary" disabled={!rows.length || !appConfig.permissions.canExport} loading={busy === 'xls'} onClick={() => exp('xls')}><FileDown className="h-4 w-4" />Excel (.xls)</Button><Button disabled={!rows.length || !appConfig.permissions.canExport} loading={busy === 'csv'} onClick={() => exp('csv')}><FileDown className="h-4 w-4" />CSV</Button></>} />
      <Tabs label="Report type" tabs={tabs} value={type} onChange={(t) => { setType(t); setPage(1); }} />
      <FilterBar onClear={() => { setF(D); setPage(1); }} active={JSON.stringify(f) !== JSON.stringify(D)}>
        <div><label htmlFor="rf" className="label">From date</label><input id="rf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="rt" className="label">To date</label><input id="rt" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
        <SelectField id="ri" label="Institution" value={f.institutionId} onChange={(x) => set({ institutionId: x })} options={institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} />
        <SelectField id="rd" label="Department" value={f.department} onChange={(x) => set({ department: x })} options={departments(oid)} />
        <SelectField id="ry" label="Year" value={f.year} onChange={(x) => set({ year: x })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
        <SelectField id="rc" label="Event category" value={f.category} onChange={(x) => set({ category: x })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
        <SelectField id="rs" label="Event status" value={f.status} onChange={(x) => set({ status: x })} options={Object.entries(eventStatuses).map(([value, label]) => ({ value, label }))} />
      </FilterBar>
      {type !== 'availability' && <Notice tone="neutral" className="mb-4">Department/year filters apply to student-based figures; category/status filters apply to event-based figures.</Notice>}

      {rows.length === 0 ? <EmptyState title="No data for these filters" text="Widen the date range or clear filters." /> : (
        <>
          <Card className="mb-4"><CardHeader title="Chart" />
            <div className="h-72" role="img" aria-label={`${type} report chart`}><ResponsiveContainer>
              {type === 'availability' ? <LineChart data={weekly} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="week" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip formatter={(x) => `${x}%`} /><Line dataKey="rate" name="Avg submission rate" stroke={C[0]} strokeWidth={2} /></LineChart>
                : type === 'events' ? <BarChart data={rows.map((r) => ({ name: r.Event.slice(0, 16), Invitations: r.Invitations, Accepted: r.Accepted, Declined: r.Declined, Pending: r.Pending }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="Accepted" fill={C[0]} /><Bar dataKey="Declined" fill={C[2]} /><Bar dataKey="Pending" fill={C[3]} /></BarChart>
                  : type === 'institutions' ? <BarChart data={rows.map((r) => ({ name: r.Code, Submission: r['Latest-week submission rate %'], Participation: r['Participation % (accepted ÷ invited)'], Attendance: r['Attendance % (present ÷ accepted)'] }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip /><Legend /><Bar dataKey="Submission" fill={C[0]} /><Bar dataKey="Participation" fill={C[1]} /><Bar dataKey="Attendance" fill={C[3]} /></BarChart>
                    : <BarChart data={part.byEvent} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="accepted" name="Accepted" fill={C[0]} /><Bar dataKey="attended" name="Present" fill={C[1]} /></BarChart>}
            </ResponsiveContainer></div>
            {part && <div className="mt-4 h-56" role="img" aria-label="Participation by institution"><ResponsiveContainer><BarChart data={part.byInstitution} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="accepted" name="Accepted" fill={C[0]} /><Bar dataKey="attended" name="Present" fill={C[1]} /></BarChart></ResponsiveContainer></div>}
          </Card>
          <Card className="p-0 sm:p-0"><div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">{type} report</caption><thead className="bg-lavender-100 text-xs uppercase text-ink-soft"><tr>{cols.map((c) => <th key={c} scope="col" className="whitespace-nowrap px-3 py-3 text-left">{c}</th>)}</tr></thead>
            <tbody className="divide-y divide-lavender-200">{rows.slice((pg - 1) * 10, pg * 10).map((r, i) => <tr key={i} className="hover:bg-lavender-50">{cols.map((c) => <td key={c} className="whitespace-nowrap px-3 py-2">{r[c]}</td>)}</tr>)}</tbody></table></div>
            <Pagination page={pg} pages={pages} total={rows.length} pageSize={10} onPage={setPage} /></Card>
        </>)}
    </>
  );
}

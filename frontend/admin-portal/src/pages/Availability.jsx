import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ChevronRight, FileDown, Info, Star } from 'lucide-react';
import { Button, Card, CardHeader, DataTable, FilterBar, Modal, Notice, PageHeader, Pagination, SelectField, StatCard, StatusBadge, Tabs } from '../components/ui';
import { AvailabilityCell, HeatmapLegend, PctCell } from '../components/availability/AvailabilityCell';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import * as av from '../services/availabilityService';
import { studentFilterOptions } from '../services/studentService';
import { downloadFile } from '../utils/exportFiles';
import { fmtDate, fmtDayNum, fmtDeadline, fmtRange, fmtShort, fmtWeekday, isoWeekNumber } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';
import { Hourglass, PencilLine, ShieldAlert, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '../utils/cn';

const D = { week: '', zone: '', institution: '', department: '', year: '', status: '', date: '', page: '1' };
export default function Availability() {
  usePageTitle('Availability monitoring'); const { aid } = useAuth(); const { can } = usePermissions(); useStore(); const nowMs = useNow(30000);
  const [f, set, clear, active] = useQueryState(D); const [exp, setExp] = useState(false); const [by, setBy] = useState('zone');
  const weeks = av.weekOptions(nowMs); const ws = weeks.includes(f.week) ? f.week : av.defaultWeek(nowMs); const o = studentFilterOptions();
  const filters = { zoneId: f.zone, institutionId: f.institution, department: f.department, year: f.year };
  const ov = av.overview(aid, ws, filters); const rows = ov.rows.filter((r) => !f.status || r.weekStatus === f.status); const days = ov.days; const date = days.includes(f.date) ? f.date : days[5];
  const w = ov.stats; const ds = av.dayStats(rows, date); const best = av.bestDates(aid, ws, filters).slice(0, 3);
  const level = f.institution ? 'student' : f.zone ? 'institution' : 'zone';
  const groups = level === 'student' ? null : av.compare(aid, ws, level, { ...filters });
  const cmp = av.compare(aid, ws, by, filters); const trend = av.trend(aid, filters);
  const PAGE = 15; const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const page = Math.min(Number(f.page), pages);
  const instOpts = o.institutions.filter((i) => !f.zone || i.zoneId === f.zone);
  const drill = (key) => (level === 'zone' ? set({ zone: key, institution: '' }) : set({ institution: key }));
  const doExport = (fmt) => { try { downloadFile(av.exportAvailability(aid, ws, filters, fmt)); toast.success(`${fmt.toUpperCase()} downloaded.`); } catch (e) { toast.error(e.message); } };
  const preview = exp ? av.exportRows(aid, ws, filters) : []; const pcols = preview[0] ? Object.keys(preview[0]) : [];
  return (<>
    <PageHeader title="Availability monitoring" subtitle="System-wide weekly availability. Admins monitor; changing a student’s availability is not offered." actions={<Can perm="reports.export"><Button variant="outline" onClick={() => setExp(true)}><FileDown className="h-4 w-4" />Export</Button></Can>} />
    <Tabs label="Select week" value={ws} onChange={(v) => set({ week: v })} tabs={weeks.map((x) => ({ id: x, label: `${fmtShort(x)} (W${isoWeekNumber(x)})` }))} />
    <FilterBar onClear={clear} active={active}>
      <SelectField id="az" label="Zone" value={f.zone} onChange={(v) => set({ zone: v, institution: '' })} options={o.zones} />
      <SelectField id="ai" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={instOpts} />
      <SelectField id="ad" label="Department" value={f.department} onChange={(v) => set({ department: v })} options={o.departments} />
      <SelectField id="ay" label="Academic year" value={f.year} onChange={(v) => set({ year: v })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
      <SelectField id="as" label="Availability status" value={f.status} onChange={(v) => set({ status: v })} options={['submitted', 'draft', 'not_submitted', 'system_assumed_unavailable'].map((k) => ({ value: k, label: statusMeta[k].label }))} />
    </FilterBar>
    <Card className="mb-4 flex flex-wrap items-center justify-between gap-2"><div><p className="font-bold text-navy">{fmtRange(ws)} · Week {isoWeekNumber(ws)}</p><p className="text-sm text-ink-soft">Deadline {fmtDeadline(ov.info.deadline)} IST</p></div><div className="flex gap-2"><StatusBadge kind={ov.info.open ? 'open' : 'locked'} /></div></Card>
    <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={Users} label="Total students" value={w.total} /><StatCard icon={UserCheck} label="Submitted" value={w.submitted} hint={`${w.submissionRate}% submission`} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={PencilLine} label="Draft (not submitted)" value={w.draft} tone="text-amber-700 bg-amber-50" /><StatCard icon={Hourglass} label="Not submitted" value={w.not_submitted} tone="text-slate-700 bg-slate-100" /><StatCard icon={ShieldAlert} label="System-assumed unavailable" value={w.system_assumed_unavailable} hint="Only if rule enabled in Settings" tone="text-orange-700 bg-orange-50" /></div>

    <Card className="mb-4"><CardHeader icon={Star} title="Best-date recommendation" />
      <div className="grid gap-3 md:grid-cols-3">{best.map((b, i) => <div key={b.date} className={cn('rounded-2xl border p-4', i === 0 ? 'border-brand-400 bg-brand-50' : 'border-lavender-300')}><p className="text-xs font-bold uppercase text-ink-mute">#{i + 1}</p><p className="text-lg font-extrabold text-navy">{fmtDate(b.date)}</p><p className="text-3xl font-extrabold text-brand-700">{b.availablePct}%</p><p className="text-xs text-ink-soft">{b.available} of {b.total} students Available</p><ul className="mt-2 text-xs text-ink-soft"><li>Unavailable: <b>{b.unavailable}</b></li><li>Not submitted / no valid answer: <b>{b.noValid + b.not_selected}</b></li><li>Of those who answered: <b>{b.availableOfAnsweredPct}%</b> available</li></ul></div>)}</div>
      <Notice tone="info" icon={Info} className="mt-3">{av.BEST_DATE_NOTE}</Notice></Card>

    <Card className="mb-4 p-0 sm:p-0">
      <div className="border-b border-lavender-200 p-4"><CardHeader title="Availability heatmap – drill down" />
        <nav aria-label="Drill-down path" className="mb-2 flex flex-wrap items-center gap-1 text-sm"><button className="font-semibold text-brand-700 hover:underline" onClick={() => set({ zone: '', institution: '' })}>System</button>
          {f.zone && <><ChevronRight className="h-4 w-4" /><button className="font-semibold text-brand-700 hover:underline" onClick={() => set({ institution: '' })}>{o.zones.find((z) => z.value === f.zone)?.label}</button></>}{f.institution && <><ChevronRight className="h-4 w-4" /><span className="font-semibold text-navy">{o.institutions.find((i) => i.value === f.institution)?.label}</span></>}</nav>
        {level === 'student' ? <HeatmapLegend /> : <p className="text-xs text-ink-soft">Each cell = % of students Available (non-submitters count as not available). Click a row to drill down to {level === 'zone' ? 'its institutions' : 'its students'}.</p>}</div>
      {level === 'student' ? (<>
        <DataTable caption="Student availability" rows={rows.slice((page - 1) * PAGE, page * PAGE)} rowKey={(r) => r.student.id} columns={[{ key: 's', label: 'Student', render: (r) => <><Link to={`/students/${r.student.id}`} className="font-semibold text-navy hover:underline">{r.student.name}</Link><span className="block text-xs text-ink-mute">{r.student.studentId} · {r.student.department} · Y{r.student.year}</span></> }, { key: 'w', label: 'Week status', render: (r) => <StatusBadge kind={r.weekStatus} /> }, ...days.map((d) => ({ key: d, label: `${fmtWeekday(d)} ${fmtDayNum(d)}`, className: 'w-14 !px-1 text-center', render: (r) => <AvailabilityCell state={r.days[d]} onClick={() => set({ date: d })} selected={d === date} /> }))]}
          renderCard={(r) => <div><div className="flex justify-between gap-2"><Link to={`/students/${r.student.id}`} className="font-bold text-navy">{r.student.name}</Link><StatusBadge kind={r.weekStatus} /></div><div className="mt-2 grid grid-cols-7 gap-1">{days.map((d) => <div key={d}><p className="text-center text-[10px] text-ink-mute">{fmtWeekday(d)[0]}</p><AvailabilityCell state={r.days[d]} /></div>)}</div></div>} />
        <Pagination page={page} pages={pages} total={rows.length} pageSize={PAGE} onPage={(p) => set({ page: p })} /></>) : (
        <div className="overflow-x-auto p-4"><table className="w-full min-w-[640px] text-sm"><caption className="sr-only">Percentage available per {level} and day</caption><thead><tr><th scope="col" className="py-2 pr-3 text-left text-xs uppercase text-ink-soft">{level === 'zone' ? 'Zone' : 'Institution'}</th>{days.map((d) => <th key={d} scope="col" className="px-1 text-center text-xs uppercase text-ink-soft">{fmtWeekday(d)} {fmtDayNum(d)}</th>)}<th scope="col" className="px-2 text-xs uppercase text-ink-soft">Submitted</th></tr></thead>
          <tbody>{groups.map((g) => <tr key={g.key}><th scope="row" className="py-1 pr-3 text-left"><button className="font-semibold text-navy hover:underline" onClick={() => drill(g.key)}>{g.name}</button><span className="block text-xs font-normal text-ink-mute">{g.total} students</span></th>{g.cells.map((c) => <td key={c.date} className="p-1"><PctCell pct={c.availablePct} count={c.available} /></td>)}<td className="px-2 text-center text-xs font-bold">{g.submissionRate}%</td></tr>)}</tbody></table></div>)}
    </Card>

    <Card className="mb-4"><CardHeader title={fmtDate(date)} />
      <div className="grid gap-3 sm:grid-cols-4">{[['Available', ds.available, 'text-emerald-700'], ['Unavailable', ds.unavailable, 'text-rose-700'], ['Not submitted / no valid answer', ds.noValid + ds.not_selected, 'text-slate-700'], ['Total students', ds.total, 'text-navy']].map(([k, v, c]) => <div key={k} className="rounded-xl bg-lavender-50 p-3"><p className="text-xs text-ink-mute">{k}</p><p className={cn('text-2xl font-extrabold', c)}>{v}</p></div>)}</div>
      <p className="mt-2 text-sm">Availability {ds.availablePct}% of all students · {ds.availableOfAnsweredPct}% of those who answered. Draft {ds.draft}, not submitted {ds.not_submitted}, assumed {ds.system_assumed_unavailable}, not selected {ds.not_selected} are separate states.</p>
      <div className="mt-2 flex flex-wrap gap-1">{days.map((d) => <button key={d} onClick={() => set({ date: d })} aria-pressed={d === date} className={cn('rounded-pill border px-3 py-1 text-xs font-semibold', d === date ? 'border-navy bg-navy text-white' : 'border-lavender-300')}>{fmtWeekday(d)} {fmtDayNum(d)}</button>)}</div></Card>

    <div className="grid gap-4 xl:grid-cols-2">
      <Card><CardHeader title="Comparison" action={<div className="flex gap-2">{['zone', 'institution'].map((b) => <button key={b} onClick={() => setBy(b)} aria-pressed={by === b} className={cn('min-h-[36px] rounded-pill border px-3 text-xs font-semibold capitalize', by === b ? 'border-navy bg-navy text-white' : 'border-lavender-300')}>By {b}</button>)}</div>} />
        <div className="h-72" role="img" aria-label={`Submission rate and Saturday availability by ${by}`}><ResponsiveContainer><BarChart data={cmp} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} tickFormatter={(v) => (v.length > 12 ? `${v.slice(0, 10)}…` : v)} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="submissionRate" name="Submission %" fill="#0f8a76" /><Bar dataKey="satAvailable" name="Available on Saturday" fill="#1f3763" /></BarChart></ResponsiveContainer></div>
        <div className="mt-2 overflow-x-auto"><table className="w-full text-xs"><thead className="bg-lavender-100"><tr>{['Name', 'Students', 'Submitted', 'Not submitted', 'Rate'].map((h) => <th key={h} className="px-2 py-1.5 text-left">{h}</th>)}</tr></thead><tbody className="divide-y divide-lavender-200">{cmp.map((c) => <tr key={c.key}><td className="px-2 py-1.5">{c.name}</td><td className="px-2 py-1.5">{c.total}</td><td className="px-2 py-1.5">{c.submitted}</td><td className="px-2 py-1.5">{c.notSubmitted}</td><td className="px-2 py-1.5 font-bold">{c.submissionRate}%</td></tr>)}</tbody></table></div></Card>
      <Card><CardHeader title="Submission-rate trend" /><div className="h-72" role="img" aria-label="Weekly submission rate trend"><ResponsiveContainer><LineChart data={trend.map((t) => ({ ...t, label: fmtShort(t.weekStart) }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="submissionRate" name="Submission" stroke="#0f8a76" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Card>
    </div>

    <Modal open={exp} onOpenChange={setExp} size="lg" title="Export availability" description={`${preview.length} rows · ${can('reports.export') ? 'within your permissions' : ''}`} footer={<><Button variant="outline" onClick={() => setExp(false)}>Close</Button><Button variant="secondary" disabled={!preview.length} onClick={() => doExport('xls')}>Excel (.xls)</Button><Button disabled={!preview.length} onClick={() => doExport('csv')}>CSV</Button></>}>
      <Notice tone="info" className="mb-3">Preview of the first 8 rows with current filters. Exports are recorded in the audit log.</Notice><div className="overflow-x-auto"><table className="w-full text-xs"><thead className="bg-lavender-100"><tr>{pcols.map((c) => <th key={c} className="whitespace-nowrap px-2 py-2 text-left">{c}</th>)}</tr></thead><tbody className="divide-y divide-lavender-200">{preview.slice(0, 8).map((r, i) => <tr key={i}>{pcols.map((c) => <td key={c} className="whitespace-nowrap px-2 py-1.5">{r[c]}</td>)}</tr>)}</tbody></table></div></Modal>
  </>);
}

import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, FileDown, SearchX } from 'lucide-react';
import { Button, Card, CardHeader, DataTable, EmptyState, FilterBar, LinkButton, Notice, PageHeader, Pagination, SearchInput, SelectField, StatusBadge, Tabs } from '../components/ui';
import { AvailabilityCell, HeatmapLegend } from '../components/availability/AvailabilityCell';
import ExportPreview from '../components/availability/ExportPreview';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import * as av from '../services/availabilityService';
import { fmtDate, fmtDeadline, fmtInstant, fmtRange, fmtWeekday, fmtDayNum, isoWeekNumber } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';
import { cn } from '../utils/cn';

const D = { q: '', institution: '', department: '', year: '', status: '', page: '1' };
const PAGE = 12;
export default function AvailabilityDetails() {
  const { weekId } = useParams(); const { oid } = useAuth(); useStore(); const nowMs = useNow(30000);
  usePageTitle('Weekly availability');
  const [params, setParams] = useSearchParams();
  const [f, set, , active] = useQueryState({ ...D, date: '' });
  const [exp, setExp] = useState(false); const [tab, setTab] = useState('available');
  if (!av.weekOptions(nowMs).includes(weekId)) return <EmptyState icon={SearchX} title="Week not available" text="Choose one of the weeks listed on the availability overview." action={<LinkButton to="/availability" variant="secondary">Back to overview</LinkButton>} />;
  const filters = { institutionId: f.institution, department: f.department, year: f.year };
  const { rows: all, days, info } = av.matrix(oid, weekId, filters, nowMs);
  const needle = f.q.trim().toLowerCase();
  const rows = all.filter((r) => (!f.status || r.weekStatus === f.status) && (!needle || r.student.name.toLowerCase().includes(needle) || r.student.studentId.toLowerCase().includes(needle)));
  const date = days.includes(f.date) ? f.date : days[5];
  const ds = av.dayStats(all, date); const w = av.weekStats(all);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE)); const page = Math.min(Number(f.page), pages);
  const pick = (d) => { const n = new URLSearchParams(params); n.set('date', d); setParams(n, { replace: true }); };
  const groups = { available: all.filter((r) => r.days[date] === 'available'), unavailable: all.filter((r) => r.days[date] === 'unavailable'), none: all.filter((r) => !['available', 'unavailable'].includes(r.days[date])) };
  const list = groups[tab];
  const clear = () => setParams({ date }, { replace: true });
  return (
    <>
      <Link to="/availability" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />Availability overview</Link>
      <PageHeader title={`Week ${isoWeekNumber(weekId)} · ${fmtRange(weekId)}`} subtitle={`Deadline ${fmtDeadline(info.deadline)} IST · ${info.open ? 'Open – students can still change availability' : 'Locked'}`} actions={<Button variant="outline" onClick={() => setExp(true)}><FileDown className="h-4 w-4" />Export</Button>} />

      <Card className="mb-4"><CardHeader title="Select a date" />
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2">{days.map((d) => { const s = av.dayStats(all, d); return (
          <button key={d} onClick={() => pick(d)} aria-pressed={d === date} className={cn('rounded-xl border p-2 text-center', d === date ? 'border-brand-600 bg-brand-50 ring-2 ring-brand-600' : 'border-lavender-300 bg-white')}>
            <span className="block text-[10px] font-bold uppercase text-ink-mute sm:text-xs">{fmtWeekday(d)}</span><span className="block text-lg font-extrabold text-navy">{fmtDayNum(d)}</span><span className="block text-xs font-bold text-emerald-700">{s.availablePct}%</span><span className="hidden text-[11px] text-ink-mute sm:block">{s.available}/{s.total}</span></button>); })}</div></Card>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1"><CardHeader title={fmtDate(date)} />
          <dl className="grid grid-cols-2 gap-3 text-sm">{[['Available', ds.available, 'text-emerald-700'], ['Unavailable', ds.unavailable, 'text-rose-700'], ['Not submitted / no valid answer', ds.noValid + ds.not_selected, 'text-slate-700'], ['Total in group', ds.total, 'text-navy']].map(([k, v, c]) => <div key={k}><dt className="text-xs text-ink-mute">{k}</dt><dd className={cn('text-2xl font-extrabold', c)}>{v}</dd></div>)}</dl>
          <p className="mt-3 text-sm">Availability: <b>{ds.availablePct}%</b> of all students · <b>{ds.availableOfRespondersPct}%</b> of those who answered</p>
          <p className="mt-1 text-sm">Week submission rate: <b>{w.submissionRate}%</b> ({w.submitted}/{w.total})</p>
          <Notice tone="neutral" className="mt-3">Draft ({ds.draft}), not submitted ({ds.not_submitted}), system-assumed ({ds.system_assumed_unavailable}) and “not selected” ({ds.not_selected}) are kept separate and are not counted as explicit Unavailable.</Notice></Card>
        <Card className="lg:col-span-2"><CardHeader title="Students on this date" />
          <Tabs label="Group" value={tab} onChange={setTab} tabs={[{ id: 'available', label: 'Available', count: groups.available.length }, { id: 'unavailable', label: 'Unavailable', count: groups.unavailable.length }, { id: 'none', label: 'Not submitted / no valid answer', count: groups.none.length }]} />
          {list.length === 0 ? <EmptyState title="No students in this group" /> : <ul className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">{list.map((r) => <li key={r.student.id} className="flex items-center justify-between gap-2 rounded-xl border border-lavender-200 p-2 text-sm"><Link to={`/students/${r.student.id}`} className="truncate font-semibold text-navy hover:underline">{r.student.name}</Link>{tab === 'none' && <StatusBadge kind={r.days[date]} />}</li>)}</ul>}</Card>
      </div>

      <FilterBar onClear={clear} active={active || !!f.status}>
        <SearchInput id="aq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name or student ID" />
        <SelectField id="aai" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={av.institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} />
        <SelectField id="aad" label="Department" value={f.department} onChange={(v) => set({ department: v })} options={av.departments(oid)} />
        <SelectField id="aay" label="Year" value={f.year} onChange={(v) => set({ year: v })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
        <SelectField id="aas" label="Weekly status" value={f.status} onChange={(v) => set({ status: v })} options={['submitted', 'draft', 'not_submitted', 'system_assumed_unavailable'].map((k) => ({ value: k, label: statusMeta[k].label }))} />
      </FilterBar>

      <Card className="p-0 sm:p-0">
        <div className="border-b border-lavender-200 p-4"><CardHeader title="Student availability heatmap (Mon – Sun)" /><HeatmapLegend /></div>
        <DataTable caption="Weekly availability heatmap" rows={rows.slice((page - 1) * PAGE, page * PAGE)} rowKey={(r) => r.student.id}
          columns={[{ key: 's', label: 'Student', render: (r) => <><Link to={`/students/${r.student.id}`} className="font-semibold text-navy hover:underline">{r.student.name}</Link><span className="block text-xs text-ink-mute">{r.student.studentId}</span></> }, { key: 'i', label: 'Institution', render: (r) => <>{r.student.department} · Y{r.student.year}<span className="block text-xs text-ink-mute">{av.institutionOptions(oid).find((i) => i.id === r.student.institutionId)?.name}</span></> }, { key: 'ws', label: 'Week status', render: (r) => <StatusBadge kind={r.weekStatus} /> },
            ...days.map((d) => ({ key: d, label: `${fmtWeekday(d)} ${fmtDayNum(d)}`, className: 'w-14 !px-1 text-center', render: (r) => <AvailabilityCell state={r.days[d]} onClick={() => pick(d)} selected={d === date} /> })), { key: 'ls', label: 'Last submitted', render: (r) => (r.lastSubmittedAt ? fmtInstant(r.lastSubmittedAt) : '—') }]}
          renderCard={(r) => <div><div className="flex justify-between gap-2"><Link to={`/students/${r.student.id}`} className="font-bold text-navy">{r.student.name}</Link><StatusBadge kind={r.weekStatus} /></div><p className="text-xs text-ink-soft">{r.student.studentId} · {r.student.department} · Y{r.student.year}</p><div className="mt-2 grid grid-cols-7 gap-1">{days.map((d) => <div key={d}><p className="text-center text-[10px] text-ink-mute">{fmtWeekday(d)[0]}</p><AvailabilityCell state={r.days[d]} /></div>)}</div></div>} />
        <Pagination page={page} pages={pages} total={rows.length} pageSize={PAGE} onPage={(p) => set({ page: p })} />
      </Card>
      <ExportPreview open={exp} onOpenChange={setExp} ws={weekId} filters={filters} />
    </>
  );
}

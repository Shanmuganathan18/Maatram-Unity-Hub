import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ClipboardCheck, Percent, UserCheck, UserMinus, UserX, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, DataTable, EmptyState, FilterBar, Modal, Notice, PageHeader, PendingTag, SelectField, StatCard, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { overview, overrideAttendance, participants } from '../services/attendanceService';
import { studentFilterOptions } from '../services/studentService';
import { buildFile } from '../utils/exportFiles';
import { downloadFile } from '../utils/exportFiles';
import { eventCategories } from '../config/appConfig';
import { fmtDate } from '../utils/dates';
import { audit } from '../services/accessService';

const D = { zone: '', institution: '', category: '', from: '', to: '', status: '' };
export default function Attendance() {
  usePageTitle('Attendance overview'); const { aid } = useAuth(); const { can } = usePermissions(); useStore(); const [f, set, clear, active] = useQueryState(D); const [view, setView] = useState('event'); const [det, setDet] = useState(null);
  const o = studentFilterOptions(); const ov = overview(aid, { zoneId: f.zone, institutionId: f.institution, category: f.category, from: f.from, to: f.to, status: f.status }); const t = ov.total;
  const exportCsv = () => { if (!can('reports.export')) return; const rows = ov.rows.map((r) => ({ Event: r.event.title, Zone: r.zoneLabel, Date: r.event.date, Confirmed: r.confirmed, Present: r.present, Absent: r.absent, Excused: r.excused, 'Not marked': r.notMarked, 'Attendance %': r.pct })); audit(aid, { action: 'report.exported', category: 'Report', description: `Exported attendance overview (CSV, ${rows.length} rows)` }); downloadFile(buildFile(rows, 'csv', 'attendance-overview')); toast.success('CSV downloaded.'); };
  const part = det ? participants(aid, det.event.id) : [];
  const chart = view === 'zone' ? ov.byZone : view === 'institution' ? ov.byInstitution : ov.rows.map((r) => ({ name: r.event.title.slice(0, 18), present: r.present, absent: r.absent, excused: r.excused, pct: r.pct }));
  return (<>
    <PageHeader title="Attendance overview" subtitle="Attendance is recorded by officers. Admins view it read-only; overriding is a permission that is off by default." actions={can('reports.export') && <Button variant="outline" onClick={exportCsv}>Export CSV</Button>} />
    <FilterBar onClear={clear} active={active}>
      <SelectField id="atz" label="Zone" value={f.zone} onChange={(v) => set({ zone: v, institution: '' })} options={o.zones} />
      <SelectField id="ati" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={o.institutions.filter((i) => !f.zone || i.zoneId === f.zone)} />
      <SelectField id="atc" label="Event category" value={f.category} onChange={(v) => set({ category: v })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
      <SelectField id="ats" label="Attendance status" value={f.status} onChange={(v) => set({ status: v })} options={[{ value: 'present', label: 'Present' }, { value: 'absent', label: 'Absent' }, { value: 'excused', label: 'Excused' }, { value: 'not_marked', label: 'Not marked' }]} />
      <div><label htmlFor="atf" className="label">From</label><input id="atf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div><div><label htmlFor="att" className="label">To</label><input id="att" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
    </FilterBar>
    <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-5"><StatCard icon={Users} label="Confirmed participants" value={t.confirmed} /><StatCard icon={UserCheck} label="Present" value={t.present} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={UserX} label="Absent" value={t.absent} tone="text-rose-700 bg-rose-50" /><StatCard icon={UserMinus} label="Excused" value={t.excused} tone="text-sky-700 bg-sky-50" /><StatCard icon={Percent} label="Attendance %" value={`${t.pct}%`} hint="Present ÷ confirmed" tone="text-violet-700 bg-violet-50" /></div>
    <Tabs label="View" value={view} onChange={setView} tabs={[{ id: 'event', label: 'By event' }, { id: 'zone', label: 'By zone' }, { id: 'institution', label: 'By institution' }]} />
    {ov.rows.length === 0 ? <EmptyState icon={ClipboardCheck} title="No attendance data" text="No events with confirmed participants match these filters." /> : (<>
      <Card className="mb-4"><CardHeader title={`Attendance ${view === 'event' ? 'by event' : `by ${view}`}`} /><div className="h-72" role="img" aria-label="Attendance chart"><ResponsiveContainer><BarChart data={chart} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Legend /><Bar dataKey="present" name="Present" stackId="a" fill="#10b981" /><Bar dataKey="absent" name="Absent" stackId="a" fill="#f43f5e" /><Bar dataKey="excused" name="Excused" stackId="a" fill="#38bdf8" /></BarChart></ResponsiveContainer></div></Card>
      <Card className="p-0 sm:p-0"><DataTable caption="Attendance by event" rowKey={(r) => r.event.id} rows={view === 'event' ? ov.rows : view === 'zone' ? ov.byZone.map((g, i) => ({ ...g, event: { id: `z${i}` } })) : ov.byInstitution.map((g, i) => ({ ...g, event: { id: `i${i}` } }))}
        columns={view === 'event' ? [{ key: 'e', label: 'Event', render: (r) => <><button className="font-semibold text-navy hover:underline" onClick={() => setDet(r)}>{r.event.title}</button><span className="block text-xs text-ink-mute">{eventCategories[r.event.category]}</span></> }, { key: 'z', label: 'Zone', render: (r) => r.zoneLabel }, { key: 'd', label: 'Date', render: (r) => fmtDate(r.event.date) }, { key: 'c', label: 'Confirmed', render: (r) => r.confirmed }, { key: 'p', label: 'Present', render: (r) => r.present }, { key: 'a', label: 'Absent', render: (r) => r.absent }, { key: 'x', label: 'Excused', render: (r) => r.excused }, { key: 'n', label: 'Not marked', render: (r) => r.notMarked }, { key: 'pc', label: 'Attendance', render: (r) => <b>{r.pct}%</b> }]
          : [{ key: 'n', label: view === 'zone' ? 'Zone' : 'Institution', render: (r) => <b className="text-navy">{r.name}</b> }, { key: 'c', label: 'Confirmed', render: (r) => r.confirmed }, { key: 'p', label: 'Present', render: (r) => r.present }, { key: 'a', label: 'Absent', render: (r) => r.absent }, { key: 'x', label: 'Excused', render: (r) => r.excused }, { key: 'pc', label: 'Attendance', render: (r) => <b>{r.pct}%</b> }]}
        renderCard={(r) => <div><button className="text-left font-bold text-navy" onClick={() => view === 'event' && setDet(r)}>{r.event?.title && view === 'event' ? r.event.title : r.name}</button><p className="text-sm">{r.present}/{r.confirmed} present · {r.pct}%</p></div>} /></Card></>)}
    <Modal open={!!det} onOpenChange={(o) => !o && setDet(null)} size="lg" title={det?.event.title ?? ''} description={det ? `${det.zoneLabel} · ${fmtDate(det.event.date)}` : ''} footer={<Button variant="outline" onClick={() => setDet(null)}>Close</Button>}>
      <Notice tone="neutral" className="mb-3">Recorded by the zone officer. {can('attendance.override') ? 'You may override entries (audited).' : <>Read-only – admin override is <PendingTag /> and not granted to your role.</>} <Link className="font-semibold underline" to={det ? `/events/${det.event.id}` : '#'}>Open event</Link></Notice>
      <div className="max-h-80 overflow-y-auto"><table className="w-full text-sm"><thead className="bg-lavender-100 text-xs uppercase"><tr><th className="px-2 py-2 text-left">Student</th><th className="px-2 py-2 text-left">Institution</th><th className="px-2 py-2 text-left">Attendance</th></tr></thead><tbody className="divide-y divide-lavender-200">{part.map((p) => <tr key={p.id}><td className="px-2 py-1.5">{p.student.name}</td><td className="px-2 py-1.5 text-xs">{p.institution}</td><td className="px-2 py-1.5">{can('attendance.override') ? <select aria-label={`Attendance for ${p.student.name}`} className="field min-h-[34px] py-1" value={p.attendance ?? ''} onChange={async (e) => { try { await overrideAttendance(aid, p.id, e.target.value || null); toast.success('Attendance overridden and audited.'); } catch (er) { toast.error(er.message); } }}><option value="">Not marked</option><option value="present">Present</option><option value="absent">Absent</option><option value="excused">Excused</option></select> : <StatusBadge kind={p.attendance ?? 'not_marked'} />}</td></tr>)}</tbody></table></div></Modal>
  </>);
}

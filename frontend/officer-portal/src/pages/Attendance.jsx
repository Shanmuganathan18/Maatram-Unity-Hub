import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Printer, SearchX } from 'lucide-react';
import { Button, Card, CardHeader, DataTable, EmptyState, FilterBar, LinkButton, Modal, Notice, PageHeader, PendingTag, SearchInput, SelectField, StatCard, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { attendanceOpen, attendanceSummary, listParticipants, markAttendance } from '../services/attendanceService';
import { eventHistory, getEvent } from '../services/eventService';
import { institutionOptions } from '../services/availabilityService';
import { appConfig } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtTimeRange } from '../utils/dates';
import { ClipboardCheck, UserCheck, UserX, UserMinus, Users, Percent } from 'lucide-react';

const D = { q: '', institution: '', status: '' };
const SheetTable = ({ rows }) => (
  <table className="w-full border-collapse text-sm"><thead><tr>{['#', 'Student ID', 'Name', 'Institution', 'Signature', 'Status'].map((h) => <th key={h} className="border border-black p-2 text-left">{h}</th>)}</tr></thead>
    <tbody>{rows.map((r, i) => <tr key={r.id}><td className="border border-black p-2">{i + 1}</td><td className="border border-black p-2">{r.student.studentId}</td><td className="border border-black p-2">{r.student.name}</td><td className="border border-black p-2">{r.institution}</td><td className="border border-black p-2 w-40" /><td className="border border-black p-2 w-24" /></tr>)}</tbody></table>
);

export default function Attendance() {
  const { eventId } = useParams(); const { oid, officer } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D); const [sel, setSel] = useState(new Set()); const [busy, setBusy] = useState(false); const [sheet, setSheet] = useState(false);
  const e = getEvent(oid, eventId); usePageTitle('Attendance');
  if (!e) return <EmptyState icon={SearchX} title="Event not found" text="This event doesn’t exist or isn’t in your zone." action={<LinkButton to="/events" variant="secondary">Back to events</LinkButton>} />;
  const rows = listParticipants(oid, eventId, { q: f.q, institutionId: f.institution, status: f.status }); const all = listParticipants(oid, eventId); const sum = attendanceSummary(oid, eventId);
  const open = attendanceOpen(e) && appConfig.permissions.canUpdateAttendance;
  const mark = async (ids, status) => { setBusy(true); try { const n = await markAttendance(oid, eventId, ids, status); toast.success(`${n} student(s) updated.`); setSel(new Set()); } catch (er) { toast.error(er.message); } finally { setBusy(false); } };
  const hist = eventHistory(oid, eventId).filter((a) => a.type === 'attendance_updated');
  return (
    <>
      <Link to={`/events/${eventId}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700 no-print"><ArrowLeft className="h-4 w-4" />{e.title}</Link>
      <div className="print:hidden">
        <PageHeader title="Attendance" subtitle={`${e.title} · ${fmtDate(e.date)} · ${fmtTimeRange(e.startTime, e.endTime)}`} actions={<Button variant="outline" onClick={() => setSheet(true)}><Printer className="h-4 w-4" />Printable sheet</Button>} />
        {!attendanceOpen(e) && <Notice tone="warn" className="mb-4" title="Attendance is read-only for now">Attendance can be recorded only while the event is In Progress or Completed (current status: {e.status.replace('_', ' ')}). <PendingTag>Rule pending client confirmation</PendingTag></Notice>}
        <Notice tone="neutral" className="mb-4">Only students who <b>accepted</b> are listed. Acceptance is not attendance – each student is marked separately. Statuses and who may update them are <PendingTag />.</Notice>
        <div className="mb-4 grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard icon={Users} label="Total confirmed" value={sum.confirmed} /><StatCard icon={UserCheck} label="Present" value={sum.present} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={UserX} label="Absent" value={sum.absent} tone="text-rose-700 bg-rose-50" />
          <StatCard icon={UserMinus} label="Excused" value={sum.excused} tone="text-sky-700 bg-sky-50" /><StatCard icon={ClipboardCheck} label="Not marked" value={sum.notMarked} tone="text-slate-700 bg-slate-100" /><StatCard icon={Percent} label="Attendance %" value={`${sum.pct}%`} hint="Present ÷ confirmed" tone="text-violet-700 bg-violet-50" />
        </div>
        <FilterBar onClear={clear} active={active}>
          <SearchInput id="aq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name or student ID" />
          <SelectField id="ai" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={institutionOptions(oid).filter((i) => e.targetInstitutionIds.includes(i.id)).map((i) => ({ value: i.id, label: i.name }))} />
          <SelectField id="as" label="Attendance status" value={f.status} onChange={(v) => set({ status: v })} options={[...appConfig.attendanceStatuses.map((s) => ({ value: s.id, label: s.label })), { value: 'not_marked', label: 'Not marked' }]} />
        </FilterBar>
        {open && <div className="mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-lavender-300 bg-white p-3"><span className="text-sm font-semibold text-navy">{sel.size} selected</span>{appConfig.attendanceStatuses.map((s) => <Button key={s.id} size="sm" variant="secondary" disabled={!sel.size} loading={busy} onClick={() => mark([...sel], s.id)}>Mark {s.label}</Button>)}<Button size="sm" variant="ghost" disabled={!sel.size} onClick={() => mark([...sel], null)}>Clear mark</Button></div>}
        <Card className="p-0 sm:p-0">
          <DataTable caption="Participants" rows={rows} selectable={open} selected={sel} onSelect={setSel} empty={<EmptyState title="No participants" text="Only students who accepted appear here." />}
            columns={[{ key: 's', label: 'Student', render: (r) => <><Link to={`/students/${r.student.id}`} className="font-semibold text-navy hover:underline">{r.student.name}</Link><span className="block text-xs text-ink-mute">{r.student.studentId}</span></> }, { key: 'i', label: 'Institution', render: (r) => r.institution }, { key: 'a', label: 'Attendance', render: (r) => <StatusBadge kind={r.attendance ?? 'not_marked'} /> },
              { key: 'm', label: 'Mark', render: (r) => (open ? <select aria-label={`Attendance for ${r.student.name}`} className="field min-h-[36px] w-36 py-1" value={r.attendance ?? ''} onChange={(x) => mark([r.id], x.target.value || null)}><option value="">Not marked</option>{appConfig.attendanceStatuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select> : '—') }]}
            renderCard={(r) => <div><div className="flex justify-between gap-2"><Link to={`/students/${r.student.id}`} className="font-bold text-navy">{r.student.name}</Link><StatusBadge kind={r.attendance ?? 'not_marked'} /></div><p className="text-xs text-ink-soft">{r.institution}</p>{open && <select aria-label={`Attendance for ${r.student.name}`} className="field mt-2" value={r.attendance ?? ''} onChange={(x) => mark([r.id], x.target.value || null)}><option value="">Not marked</option>{appConfig.attendanceStatuses.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>}</div>} />
        </Card>
        <Card className="mt-4"><CardHeader title="Attendance history" />{hist.length === 0 ? <p className="text-sm text-ink-soft">No attendance changes recorded yet.</p> : <ul className="divide-y divide-lavender-200 text-sm">{hist.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span>{a.description} · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}<p className="mt-2 text-xs text-ink-mute">History is append-only; officers cannot delete it.</p></Card>
      </div>
      <div className="hidden print:block"><h1 className="mb-1 text-xl font-bold">Attendance sheet – {e.title}</h1><p className="mb-3 text-sm">{fmtDate(e.date)} · {fmtTimeRange(e.startTime, e.endTime)} · {officer.zoneLabel}</p><SheetTable rows={all} /></div>
      <Modal open={sheet} onOpenChange={setSheet} size="lg" title="Printable attendance sheet" description="Preview. Printing includes the signature column." footer={<><Button variant="outline" onClick={() => setSheet(false)}>Close</Button><Button onClick={() => { setSheet(false); setTimeout(() => window.print(), 150); }}><Printer className="h-4 w-4" />Print</Button></>}><div className="overflow-x-auto"><SheetTable rows={all.slice(0, 8)} />{all.length > 8 && <p className="mt-2 text-xs text-ink-mute">Showing 8 of {all.length} rows in preview; the printout lists everyone.</p>}</div></Modal>
    </>
  );
}

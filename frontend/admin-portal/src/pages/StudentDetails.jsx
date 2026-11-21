import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, CheckCircle2, Pencil, Repeat } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Field, Modal, Notice, StatusBadge, Avatar } from '../components/ui';
import { Back, KV, NotFoundCard } from '../components/layout/common';
import { Can } from '../components/layout/Gate';
import { AvailabilityCell } from '../components/availability/AvailabilityCell';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { getStudentDetail, remapInstitution, setStudentStatus, studentFilterOptions, updateStudent } from '../services/studentService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtRange, fmtWeekday } from '../utils/dates';

export default function StudentDetails() {
  const { studentId } = useParams(); const { aid } = useAuth(); useStore(); const [edit, setEdit] = useState(false); const [map, setMap] = useState(false); const [conf, setConf] = useState(null); const [form, setForm] = useState({}); const [inst, setInst] = useState(''); const [run, busy] = useAction();
  const d = getStudentDetail(aid, studentId); usePageTitle(d?.student.name ?? 'Student');
  if (!d) return <NotFoundCard what="Student" to="/students" />;
  const s = d.student; const o = studentFilterOptions();
  return (<div className="space-y-4">
    <Back to="/students">Students</Back>
    <Card className="flex flex-wrap items-center gap-4"><Avatar student={s} size="h-16 w-16 text-xl" /><div className="flex-1"><h1 className="text-2xl font-extrabold">{s.name}</h1><p className="text-sm text-ink-soft">{s.studentId} · {s.institution} · {s.zoneLabel}</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={s.status} />
        <Can perm="students.edit"><Button size="sm" variant="outline" onClick={() => { setForm({ email: s.email, phone: s.phone, department: s.department, year: s.year }); setEdit(true); }}><Pencil className="h-4 w-4" />Edit approved fields</Button><Button size="sm" variant="outline" onClick={() => { setInst(''); setMap(true); }}><Repeat className="h-4 w-4" />Correct institution</Button></Can>
        <Can perm="students.toggle">{s.status === 'Active' ? <Button size="sm" variant="outline" onClick={() => setConf('Inactive')}><Ban className="h-4 w-4" />Deactivate</Button> : <Button size="sm" variant="secondary" onClick={() => setConf('Active')}><CheckCircle2 className="h-4 w-4" />Activate</Button>}</Can></div></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Personal & institution details" /><KV items={[['Email', s.email], ['Phone', s.phone], ['Institution', <Link className="text-brand-700 underline" to={`/institutions/${s.institutionId}`}>{s.institution}</Link>], ['Zone', s.zoneId ? <Link className="text-brand-700 underline" to={`/zones/${s.zoneId}`}>{s.zoneLabel}</Link> : 'Unassigned'], ['Department', s.department], ['Academic year', `Year ${s.year}`], ['Groups', s.groups.join(', ')], ['Last login', s.lastLogin ? fmtInstant(s.lastLogin) : 'Never']]} />
        <Notice tone="neutral" className="mt-3">Only approved fields (email, phone, department, year) can be edited. Zone follows the institution assignment – it is never edited directly.</Notice></Card>
      <Card><CardHeader title="Participation summary" /><dl className="space-y-2 text-sm">{[['Invitations', d.summary.invited], ['Accepted', d.summary.accepted], ['Present', d.summary.present]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-soft">{k}</dt><dd className="text-lg font-extrabold text-navy">{v}</dd></div>)}</dl></Card>
    </div>
    <Card><CardHeader title="Weekly availability history" /><DataTable caption="Availability history" rows={d.weeks} rowKey={(w) => w.weekStart}
      columns={[{ key: 'w', label: 'Week', render: (w) => fmtRange(w.weekStart) }, { key: 's', label: 'Status', render: (w) => <span className="flex gap-1"><StatusBadge kind={w.status} />{w.locked && <StatusBadge kind="locked" />}</span> }, { key: 'd', label: 'Mon → Sun', render: (w) => <div className="grid w-[260px] grid-cols-7 gap-1">{w.days.map((x) => <AvailabilityCell key={x.date} state={x.state} />)}</div> }, { key: 'a', label: 'Available', render: (w) => w.available }, { key: 'u', label: 'Unavailable', render: (w) => w.unavailable }, { key: 'sub', label: 'Submitted', render: (w) => (w.submittedAt ? fmtInstant(w.submittedAt) : '—') }]}
      renderCard={(w) => <div><p className="font-bold text-navy">{fmtRange(w.weekStart)}</p><div className="my-2 grid grid-cols-7 gap-1">{w.days.map((x) => <div key={x.date}><p className="text-center text-[10px] text-ink-mute">{fmtWeekday(x.date)[0]}</p><AvailabilityCell state={x.state} /></div>)}</div><StatusBadge kind={w.status} /></div>} /><p className="mt-2 text-xs text-ink-mute">Admins monitor availability; changing a student’s availability is not offered (unconfirmed).</p></Card>
    <Card><CardHeader title="Event invitations, responses & attendance" /><DataTable caption="Event history" rows={d.invitations} columns={[{ key: 'e', label: 'Event', render: (i) => <Link className="font-semibold text-navy hover:underline" to={`/events/${i.event.id}`}>{i.event.title}</Link> }, { key: 'c', label: 'Category', render: (i) => eventCategories[i.event.category] }, { key: 'd', label: 'Date', render: (i) => fmtDate(i.event.date) }, { key: 'r', label: 'Response', render: (i) => <StatusBadge kind={i.response} /> }, { key: 'a', label: 'Attendance', render: (i) => <StatusBadge kind={i.attendance ?? 'not_marked'} /> }]}
      renderCard={(i) => <div><Link className="font-bold text-navy" to={`/events/${i.event.id}`}>{i.event.title}</Link><p className="text-xs text-ink-soft">{fmtDate(i.event.date)}</p><div className="mt-2 flex gap-2"><StatusBadge kind={i.response} /><StatusBadge kind={i.attendance ?? 'not_marked'} /></div></div>} empty={<EmptyState title="Not invited to any event yet" />} /></Card>
    <Card><CardHeader title="Record history" />{d.history.length === 0 ? <p className="text-sm text-ink-soft">No admin changes recorded.</p> : <ul className="divide-y divide-lavender-200 text-sm">{d.history.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>

    <Modal open={edit} onOpenChange={setEdit} title="Edit approved fields" footer={<><Button variant="outline" onClick={() => setEdit(false)}>Cancel</Button><Button loading={busy} onClick={async () => { const r = await run(() => updateStudent(aid, studentId, form), 'Student updated.'); if (r.ok) setEdit(false); }}>Save changes</Button></>}>
      <div className="grid gap-3"><Field label="Email" htmlFor="se"><input id="se" type="email" className="field" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field><Field label="Phone" htmlFor="sp"><input id="sp" className="field" value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
        <Field label="Department" htmlFor="sd"><input id="sd" className="field" value={form.department ?? ''} onChange={(e) => setForm({ ...form, department: e.target.value })} /></Field><Field label="Year" htmlFor="sy"><select id="sy" className="field" value={form.year ?? 1} onChange={(e) => setForm({ ...form, year: e.target.value })}>{[1, 2, 3, 4].map((y) => <option key={y}>{y}</option>)}</select></Field></div></Modal>
    <ConfirmDialog open={map} loading={busy} onCancel={() => setMap(false)} confirmLabel="Correct mapping" title="Correct institution mapping" description="The student’s zone will follow the new institution." onConfirm={async () => { if (!inst) { toast.error('Choose an institution.'); return; } const r = await run(() => remapInstitution(aid, [studentId], inst), 'Institution mapping corrected.'); if (r.ok) setMap(false); }}>
      <label htmlFor="mi" className="label">New institution</label><select id="mi" className="field" value={inst} onChange={(e) => setInst(e.target.value)}><option value="">Select…</option>{o.institutions.filter((i) => i.zoneId && i.value !== s.institutionId).map((i) => <option key={i.value} value={i.value}>{i.label}</option>)}</select></ConfirmDialog>
    <ConfirmDialog open={!!conf} loading={busy} onCancel={() => setConf(null)} tone={conf === 'Inactive' ? 'danger' : 'primary'} title={`${conf === 'Inactive' ? 'Deactivate' : 'Activate'} this account?`} description={s.name} confirmLabel={conf === 'Inactive' ? 'Deactivate' : 'Activate'} onConfirm={async () => { const r = await run(() => setStudentStatus(aid, studentId, conf), `Account set to ${conf}.`); if (r.ok) setConf(null); }} />
  </div>);
}

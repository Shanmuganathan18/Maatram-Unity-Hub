import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Ban, CalendarClock, CheckCircle2, FileEdit, Info, XCircle } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, DataTable, Field, Modal, Notice, StatCard, StatusBadge, PendingTag, Tabs } from '../components/ui';
import { Back, KV, NotFoundCard } from '../components/layout/common';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore, useNow } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { approvalEnabled, cancelEvent, getEventDetail, postponeEvent, reviewEvent } from '../services/eventService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtTimeRange, todayIST } from '../utils/dates';
import { Users } from 'lucide-react';

const qType = { short: 'Short text', long: 'Long text', single: 'Single choice', multiple: 'Multiple choice', yesno: 'Yes / No' };
export default function EventDetails() {
  const { eventId } = useParams(); const { aid } = useAuth(); const { can } = usePermissions(); useStore(); const nowMs = useNow(60000); const [dlg, setDlg] = useState(null); const [text, setText] = useState(''); const [date, setDate] = useState(''); const [tab, setTab] = useState(''); const [run, busy] = useAction();
  const d = getEventDetail(aid, eventId); usePageTitle(d?.event.title ?? 'Event');
  if (!d) return <NotFoundCard what="Event" to="/events" />;
  const e = d.event; const s = e.stats; const appr = approvalEnabled(); const inv = d.invitations.filter((i) => !tab || i.response === tab).slice(0, 25);
  const close = () => { setDlg(null); setText(''); setDate(''); };
  const act = { approve: () => reviewEvent(aid, eventId, 'approved', text), reject: () => reviewEvent(aid, eventId, 'rejected', text), changes: () => reviewEvent(aid, eventId, 'changes_requested', text), postpone: () => postponeEvent(aid, eventId, date, text), cancel: () => cancelEvent(aid, eventId, text) };
  const titles = { approve: 'Approve event', reject: 'Reject event', changes: 'Request changes', postpone: 'Postpone event', cancel: 'Cancel event' };
  const canPostpone = ['published', 'invitations_open'].includes(e.status); const canCancel = !['completed', 'cancelled'].includes(e.status);
  return (<div className="space-y-4">
    <Back to="/events">Events</Back>
    <Card><div className="flex flex-wrap items-start justify-between gap-3"><div><div className="mb-2 flex flex-wrap gap-2"><Badge className="border-navy/20 bg-lavender-100 text-navy">{eventCategories[e.category]}</Badge><StatusBadge kind={e.status} />{appr && <StatusBadge kind={e.approvalStatus === 'pending' ? 'pending' : e.approvalStatus} label={`Approval: ${e.approvalStatus}`} />}</div><h1 className="text-2xl font-extrabold">{e.title}</h1><p className="mt-1 max-w-3xl text-sm text-ink-soft">{e.description}</p></div>
      <div className="flex flex-wrap gap-2">
        {appr && e.approvalStatus === 'pending' && <><Can perm="events.approve"><Button size="sm" onClick={() => setDlg('approve')}><CheckCircle2 className="h-4 w-4" />Approve</Button></Can><Can perm="events.reject"><Button size="sm" variant="outline" onClick={() => setDlg('changes')}><FileEdit className="h-4 w-4" />Request changes</Button><Button size="sm" variant="outline" onClick={() => setDlg('reject')}><XCircle className="h-4 w-4" />Reject</Button></Can></>}
        <Can perm="events.postpone">{canPostpone && <Button size="sm" variant="outline" onClick={() => setDlg('postpone')}><CalendarClock className="h-4 w-4" />Postpone</Button>}</Can>
        <Can perm="events.cancel">{canCancel && <Button size="sm" variant="danger" onClick={() => setDlg('cancel')}><Ban className="h-4 w-4" />Cancel event</Button>}</Can></div></div>
      {e.statusNote && <Notice tone="warn" className="mt-3" title={e.originalDate ? `Postponed (was ${fmtDate(e.originalDate)})` : 'Note'}>{e.statusNote}</Notice>}
      {e.approvalNote && appr && <Notice tone="neutral" className="mt-3" title="Approval note">{e.approvalNote}</Notice>}
      {!appr && <p className="mt-3 text-xs text-ink-mute">Event approval workflow is switched off (System Settings → Events) – officers publish without admin approval <PendingTag>Unconfirmed workflow</PendingTag></p>}</Card>
    <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6"><StatCard icon={Users} label="Invited" value={s.invited} /><StatCard icon={Users} label="Accepted" value={s.accepted} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={Users} label="Declined" value={s.declined} tone="text-rose-700 bg-rose-50" /><StatCard icon={Users} label="Pending" value={s.pending} tone="text-amber-700 bg-amber-50" /><StatCard icon={Users} label="Present" value={s.present} hint={`${s.absent} absent · ${s.excused} excused`} tone="text-violet-700 bg-violet-50" /><StatCard icon={Users} label="Response rate" value={`${s.responseRate}%`} hint={`Attendance ${s.attendanceRate}%`} tone="text-sky-700 bg-sky-50" /></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Event information" /><KV items={[['Zone', <Link className="text-brand-700 underline" to={`/zones/${e.zoneId}`}>{e.zoneLabel}</Link>], ['Creating officer', e.createdBy ? <Link className="text-brand-700 underline" to={`/officers/${e.createdBy}`}>{e.officer}</Link> : e.officer], ['Date', fmtDate(e.date)], ['Time (IST)', fmtTimeRange(e.startTime, e.endTime)], ['Location', e.mode === 'online' ? `${e.platform} · ${e.link}` : [e.venue, e.address].filter(Boolean).join(', ')], ['Response deadline', e.responseDeadline ? fmtInstant(Date.parse(e.responseDeadline)) : '—'], ['Target institutions', e.institutionNames.join(', ')], ['Audience filters', `Departments: ${e.departments.join(', ') || 'all'} · Years: ${e.years.join(', ') || 'all'} · Groups: ${e.groups.join(', ') || 'all'}`], ['Capacity', e.capacity ? `${e.capacity} seats (${s.waitlisted} waitlisted)` : 'Unlimited']]} /></Card>
      <Card><CardHeader title="Custom questions" />{e.questions.length === 0 ? <p className="text-sm text-ink-soft">No custom questions.</p> : <ol className="list-decimal space-y-2 pl-5 text-sm">{e.questions.map((q) => <li key={q.id}><span className="font-semibold text-navy">{q.label}</span>{q.required && <span className="text-rose-700"> *</span>}<span className="block text-xs text-ink-mute">{qType[q.type]}{q.options ? `: ${q.options.join(' / ')}` : ''}</span></li>)}</ol>}</Card>
    </div>
    <Card><CardHeader title="Invitations & responses" /><Tabs label="Response" value={tab} onChange={setTab} tabs={[{ id: '', label: 'All', count: s.invited }, { id: 'pending', label: 'Pending', count: s.pending }, { id: 'accepted', label: 'Accepted', count: s.accepted }, { id: 'declined', label: 'Declined', count: s.declined }, { id: 'withdrawn', label: 'Withdrawn', count: s.withdrawn }, ...(e.capacity ? [{ id: 'waitlisted', label: 'Waitlisted', count: s.waitlisted }] : [])]} />
      <DataTable caption="Responses" rows={inv} columns={[{ key: 's', label: 'Student', render: (i) => <Link className="font-semibold text-navy hover:underline" to={`/students/${i.studentId}`}>{i.student.name}</Link> }, { key: 'id', label: 'ID', render: (i) => i.student.studentId }, { key: 'r', label: 'Response', render: (i) => <StatusBadge kind={i.response} /> }, { key: 'd', label: 'Responded', render: (i) => (i.respondedAt ? fmtInstant(i.respondedAt) : '—') }, { key: 'a', label: 'Attendance', render: (i) => <StatusBadge kind={i.attendance ?? 'not_marked'} /> }]}
        renderCard={(i) => <div><div className="flex justify-between gap-2"><Link className="font-bold text-navy" to={`/students/${i.studentId}`}>{i.student.name}</Link><StatusBadge kind={i.response} /></div><StatusBadge kind={i.attendance ?? 'not_marked'} /></div>} />
      <p className="mt-2 text-xs text-ink-mute">Showing up to 25 rows. Availability, invitation response and attendance are separate records.{can('attendance.view') && <> <Link to="/attendance" className="font-semibold text-brand-700 underline">Attendance overview</Link></>}</p></Card>
    <Card><CardHeader title="Event activity history" />{d.activity.length === 0 ? <p className="text-sm text-ink-soft">No recorded activity.</p> : <ul className="divide-y divide-lavender-200 text-sm">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>

    <Modal open={!!dlg} onOpenChange={(o) => !o && close()} title={titles[dlg] ?? ''} description={e.title} footer={<><Button variant="outline" onClick={close}>Back</Button><Button variant={['cancel', 'reject'].includes(dlg) ? 'danger' : 'primary'} loading={busy} onClick={async () => { const r = await run(act[dlg], `${titles[dlg]} – done and recorded in the audit log.`); if (r.ok) close(); }}>{titles[dlg]}</Button></>}>
      <div className="space-y-3">{dlg === 'postpone' && <Field label="New date *" htmlFor="pd"><input id="pd" type="date" min={todayIST(nowMs)} className="field" value={date} onChange={(x) => setDate(x.target.value)} /></Field>}
        <Field label={dlg === 'approve' ? 'Note (optional)' : dlg === 'cancel' ? 'Reason * (shown to officer)' : dlg === 'postpone' ? 'Reason' : 'Note for the officer *'} htmlFor="pn"><textarea id="pn" rows={3} className="field" value={text} onChange={(x) => setText(x.target.value)} /></Field>
        {['cancel', 'postpone'].includes(dlg) && <p className="flex items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm text-amber-900"><Info className="mt-0.5 h-4 w-4 shrink-0" />This overrides an officer-created event. Whether admins may do this is <PendingTag />.</p>}</div></Modal>
  </div>);
}

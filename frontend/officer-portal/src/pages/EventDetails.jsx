import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Bell, CalendarDays, ClipboardCheck, Clock, Info, MapPin, MessageSquareText, SearchX, TriangleAlert, Users, Video } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, LinkButton, Modal, Notice, PendingTag, Progress, StatCard, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { changeStatus, eventHistory, findConflicts, getEvent, physicalEligibility, reminderPreview } from '../services/eventService';
import { appConfig, eventCategories, transitions } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtTimeRange, todayIST } from '../utils/dates';

const act = { published: 'Publish', invitations_open: 'Send invitations', in_progress: 'Start event', completed: 'Mark completed', postponed: 'Postpone', cancelled: 'Cancel event' };
const allowedFlag = { published: 'canPublishEvents', invitations_open: 'canPublishEvents', postponed: 'canPostponeEvents', cancelled: 'canCancelEvents' };
const qType = { short: 'Short text', long: 'Long text', single: 'Single choice', multiple: 'Multiple choice', yesno: 'Yes / No' };

export default function EventDetails() {
  const { eventId } = useParams(); const { oid } = useAuth(); useStore(); const nowMs = useNow(60000);
  const e = getEvent(oid, eventId);
  usePageTitle(e?.title ?? 'Event');
  const [dlg, setDlg] = useState(null); const [busy, setBusy] = useState(false); const [newDate, setNewDate] = useState(''); const [reason, setReason] = useState('');
  if (!e) return <EmptyState icon={SearchX} title="Event not found" text="This event doesn’t exist or isn’t in your zone." action={<LinkButton to="/events" variant="secondary">Back to events</LinkButton>} />;
  const s = e.stats; const pv = e.category === 'physical_verification' ? physicalEligibility(oid, e) : null;
  const conflicts = !['cancelled', 'completed'].includes(e.status) ? findConflicts(oid, e) : [];
  const run = async () => {
    setBusy(true);
    try { await changeStatus(oid, e.id, dlg, { newDate, reason }); toast.success(`${act[dlg]} – done.`); setDlg(null); setReason(''); setNewDate(''); } catch (er) { toast.error(er.message); } finally { setBusy(false); }
  };
  const preview = dlg === 'reminder' ? reminderPreview(oid, e.id) : null;
  return (
    <div className="space-y-4">
      <Link to="/events" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />All events</Link>
      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div><div className="mb-2 flex flex-wrap gap-2"><Badge className="border-navy/20 bg-lavender-100 text-navy">{eventCategories[e.category]}</Badge><StatusBadge kind={e.status} /></div><h1 className="text-2xl font-extrabold">{e.title}</h1><p className="mt-1 max-w-3xl text-sm text-ink-soft">{e.description}</p></div>
          <div className="flex flex-wrap gap-2">
            {(transitions[e.status] ?? []).map((t) => { const ok = !allowedFlag[t] || appConfig.permissions[allowedFlag[t]]; return <Button key={t} size="sm" variant={t === 'cancelled' ? 'danger' : t === 'postponed' ? 'outline' : 'primary'} disabled={!ok} title={ok ? '' : 'Pending client confirmation'} onClick={() => setDlg(t)}>{act[t]}{!ok && ' (pending approval)'}</Button>; })}
            {['invitations_open', 'in_progress'].includes(e.status) && <Button size="sm" variant="outline" onClick={() => setDlg('reminder')}><Bell className="h-4 w-4" />Reminder preview</Button>}
          </div></div>
        {e.statusNote && <Notice tone="warn" className="mt-3" title={`${e.status === 'postponed' ? 'Postponed' : 'Note'}${e.originalDate ? ` (was ${fmtDate(e.originalDate)})` : ''}`}>{e.statusNote}</Notice>}
        {e.status === 'draft' && <Notice tone="neutral" className="mt-3">Draft – students cannot see this event. Publish or send invitations when ready.</Notice>}
        {e.status === 'published' && <Notice tone="neutral" className="mt-3">Published but invitations have not been sent yet – no student can respond until you send invitations.</Notice>}
      </Card>
      {conflicts.length > 0 && <Notice tone="warn" icon={TriangleAlert} title="Possible conflicts (warning only)">{conflicts.map((c) => <p key={c.event.id}><Link className="font-semibold underline" to={`/events/${c.event.id}`}>{c.event.title}</Link> targets {c.sharedStudents} of the same students on the same day{c.exactTime ? ' at an overlapping time' : ''}.</p>)}</Notice>}

      <div className="grid gap-3 sm:grid-cols-3 xl:grid-cols-6">
        <StatCard icon={Users} label="Invited" value={s.invited} hint={`Target: ${e.targetCount}`} to={`/events/${e.id}/responses`} />
        <StatCard icon={Users} label="Accepted" value={s.accepted} tone="text-emerald-700 bg-emerald-50" to={`/events/${e.id}/responses?response=accepted`} />
        <StatCard icon={Users} label="Declined" value={s.declined} tone="text-rose-700 bg-rose-50" to={`/events/${e.id}/responses?response=declined`} />
        <StatCard icon={Clock} label="Pending" value={s.pending} tone="text-amber-700 bg-amber-50" to={`/events/${e.id}/responses?response=pending`} />
        <StatCard icon={ClipboardCheck} label="Present" value={s.present} tone="text-violet-700 bg-violet-50" to={`/events/${e.id}/attendance`} hint={`${s.absent} absent · ${s.excused} excused`} />
        {e.capacity ? <StatCard icon={Users} label="Seats left" value={s.seatsLeft} hint={`Capacity ${e.capacity} · ${s.waitlisted} waitlisted`} tone="text-sky-700 bg-sky-50" /> : <StatCard icon={Users} label="Withdrawn" value={s.withdrawn} tone="text-slate-700 bg-slate-100" />}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Event information" />
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Row icon={CalendarDays} k="Date">{fmtDate(e.date)}</Row><Row icon={Clock} k="Time (IST)">{fmtTimeRange(e.startTime, e.endTime)}</Row>
            <Row icon={e.mode === 'online' ? Video : MapPin} k="Location">{e.mode === 'online' ? <>{e.platform} · <a className="text-brand-700 underline" href={e.link}>{e.link}</a></> : <>{e.venue}{e.address && `, ${e.address}`}</>}</Row>
            <Row icon={Clock} k="Response deadline">{e.responseDeadline ? fmtInstant(Date.parse(e.responseDeadline)) : '—'}</Row>
            <Row icon={Users} k="Organizer">{e.organizer}</Row><Row icon={Info} k="Contact">{e.contact}</Row>
            <Row icon={Users} k="Target audience"><span>{e.institutionNames.join(', ')}</span><span className="block text-xs text-ink-mute">Departments: {e.departments.join(', ') || 'all'} · Years: {e.years.join(', ') || 'all'} · Groups: {e.groups.join(', ') || 'all'}</span></Row>
            {e.instructions && <Row icon={Info} k="Instructions">{e.instructions}</Row>}
          </dl>
          <div className="mt-4"><p className="mb-1 flex justify-between text-xs text-ink-soft"><span>Response progress</span><span>{s.invited - s.pending}/{s.invited} responded</span></p><Progress value={s.invited ? ((s.invited - s.pending) / s.invited) * 100 : 0} label="Responded share" /></div>
          <div className="mt-4 flex flex-wrap gap-2"><LinkButton to={`/events/${e.id}/responses`} variant="secondary" size="sm"><MessageSquareText className="h-4 w-4" />Responses</LinkButton><LinkButton to={`/events/${e.id}/attendance`} variant="secondary" size="sm"><ClipboardCheck className="h-4 w-4" />Attendance</LinkButton></div>
          <p className="mt-3 text-xs text-ink-mute">Weekly availability, invitation response and attendance are separate records: Available ≠ accepted, and accepted ≠ attended.</p></Card>
        <Card><CardHeader title="Custom questions" />
          {e.questions.length === 0 ? <p className="text-sm text-ink-soft">No custom questions.</p> : <ol className="list-decimal space-y-2 pl-5 text-sm">{e.questions.map((q) => <li key={q.id}><span className="font-semibold text-navy">{q.label}</span>{q.required && <span className="text-rose-700"> *</span>}<span className="block text-xs text-ink-mute">{qType[q.type]}{q.options ? `: ${q.options.join(' / ')}` : ''}</span></li>)}</ol>}</Card>
      </div>

      {pv && <Card><CardHeader title="Physical verification – eligibility" />
        <Notice tone="info" icon={Info} className="mb-3">Eligibility rule <PendingTag />: targeted students who marked <b>Available</b> on {fmtDate(e.date)}. Students’ original availability is untouched.</Notice>
        <div className="grid gap-3 sm:grid-cols-3 text-sm"><div className="rounded-xl bg-emerald-50 p-3"><b className="text-xl text-emerald-800">{pv.eligible.length}</b><br />Eligible (Available)</div><div className="rounded-xl bg-rose-50 p-3"><b className="text-xl text-rose-800">{pv.counts.unavailable}</b><br />Unavailable</div><div className="rounded-xl bg-slate-100 p-3"><b className="text-xl text-slate-800">{pv.counts.notSubmitted}</b><br />Not submitted / no valid answer</div></div>
        <details className="mt-3"><summary className="cursor-pointer font-semibold text-navy">Excluded students and reasons ({pv.excluded.length})</summary><ul className="mt-2 max-h-52 space-y-1 overflow-y-auto text-sm">{pv.excluded.map((x) => <li key={x.student.id} className="flex flex-wrap items-center gap-2 rounded-lg border border-lavender-200 p-2"><Link to={`/students/${x.student.id}`} className="font-semibold text-navy hover:underline">{x.student.name}</Link><StatusBadge kind={x.state} /><span className="text-xs text-ink-soft">{x.reason}</span></li>)}</ul></details></Card>}

      <Card><CardHeader title="Event activity history" />
        {eventHistory(oid, e.id).length === 0 ? <p className="text-sm text-ink-soft">No recorded activity.</p> : <ul className="divide-y divide-lavender-200">{eventHistory(oid, e.id).map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2 text-sm"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>

      <ConfirmDialog open={!!dlg && !['reminder', 'postponed', 'cancelled'].includes(dlg)} loading={busy} onCancel={() => setDlg(null)} onConfirm={run} title={`${act[dlg] ?? ''}?`} description={dlg === 'invitations_open' ? `Invitations will be created for the targeted${pv ? ' and eligible' : ''} students. Students respond separately from their availability.` : `Move "${e.title}" forward in the workflow.`} confirmLabel={act[dlg]} />
      <Modal open={dlg === 'postponed'} onOpenChange={(o) => !o && setDlg(null)} title="Postpone event" description="Students keep their invitations; choose the new date." footer={<><Button variant="outline" onClick={() => setDlg(null)}>Back</Button><Button loading={busy} onClick={run}>Postpone</Button></>}>
        <div className="space-y-3"><Field label="New date *" htmlFor="nd"><input id="nd" type="date" min={todayIST(nowMs)} className="field" value={newDate} onChange={(x) => setNewDate(x.target.value)} /></Field><Field label="Reason (shown in the event note)" htmlFor="pr"><textarea id="pr" rows={2} className="field" value={reason} onChange={(x) => setReason(x.target.value)} /></Field></div></Modal>
      <ConfirmDialog open={dlg === 'cancelled'} loading={busy} onCancel={() => setDlg(null)} onConfirm={run} tone="danger" title="Cancel this event?" description="Students will see the event as cancelled. This cannot be undone in the prototype." confirmLabel="Cancel event"><Field label="Reason (optional)" htmlFor="cr"><textarea id="cr" rows={2} className="field" value={reason} onChange={(x) => setReason(x.target.value)} /></Field></ConfirmDialog>
      <Modal open={dlg === 'reminder'} onOpenChange={(o) => !o && setDlg(null)} size="lg" title="Reminder preview" description="Preview only – nothing is sent. Real delivery (email/SMS/WhatsApp) comes with the backend." footer={<Button variant="outline" onClick={() => setDlg(null)}>Close</Button>}>
        {!preview?.length ? <EmptyState title="No one would be reminded" text="Every invited student has already responded." /> : <><p className="mb-2 text-sm font-semibold">{preview.length} student(s) would receive a reminder:</p><ul className="max-h-72 space-y-1 overflow-y-auto">{preview.map((p) => <li key={p.student.id} className="rounded-lg border border-lavender-200 p-2 text-sm"><b>{p.student.name}</b> <span className="text-xs text-ink-mute">({p.student.studentId})</span><span className="block text-xs text-ink-soft">Why: {p.reason}</span></li>)}</ul></>}
      </Modal>
    </div>
  );
}
const Row = ({ icon: I, k, children }) => <div className="flex gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden /><div><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{children}</dd></div></div>;

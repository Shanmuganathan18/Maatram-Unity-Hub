import { useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { ArrowLeft, CalendarDays, CalendarPlus, Clock, Info, Mail, MapPin, Phone, Undo2, Users, Video, Ban, CalendarClock, RefreshCw, SearchX } from 'lucide-react';
import { Button, Card, CardHeader, ConfirmDialog, EmptyState, Field, LinkButton, Notice, StatusBadge, Badge } from '../components/ui';
import ConflictWarning from '../components/events/ConflictWarning';
import FeedbackForm from '../components/events/FeedbackForm';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { canGiveFeedback, canRespond, getConflicts, getEventForStudent, getFeedback, respond, withdraw } from '../services/eventService';
import { getDayInfo } from '../services/availabilityService';
import { buildAnswersSchema } from '../utils/validators';
import { buildIcs, download } from '../utils/exports';
import { appConfig, eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtTimeRange } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';

export default function EventDetails() {
  const { eventId } = useParams();
  const { sid } = useAuth();
  useStore();
  const nowMs = useNow(30000);
  const item = getEventForStudent(sid, eventId);
  usePageTitle(item?.event.title ?? 'Event');
  if (!item) return <EmptyState icon={SearchX} title="Event not available" text="This event doesn’t exist or isn’t available for your account." action={<LinkButton to="/events" variant="secondary">Back to events</LinkButton>} />;
  return <Details key={eventId + item.invitation.response} item={item} sid={sid} nowMs={nowMs} />;
}

function Details({ item, sid, nowMs }) {
  const { event: e, invitation: inv } = item;
  const [params] = useSearchParams();
  const can = canRespond(e, nowMs);
  const conflicts = appConfig.features.eventConflicts ? getConflicts(sid, e.id) : [];
  const dayInfo = getDayInfo(sid, e.date, nowMs);
  const [intent, setIntent] = useState(params.get('respond') === 'decline' ? 'decline' : null);
  const intentRef = useRef(intent);
  const [confirm, setConfirm] = useState(null);
  const [busy, setBusy] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);

  const schemaFor = (i) => z.object({ answers: i === 'decline' ? z.any() : buildAnswersSchema(e.questions), reason: i === 'decline' && e.declineReasonRequired ? z.string().trim().min(3, 'Please give a short reason for declining.') : z.string().optional() });
  const defaults = Object.fromEntries(e.questions.map((q) => [q.id, inv.answers[q.id] ?? (q.type === 'checkbox' ? false : '')]));
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: (v, c, o) => zodResolver(schemaFor(intentRef.current))(v, c, o), defaultValues: { answers: defaults, reason: inv.declineReason } });

  const start = (kind) => { intentRef.current = kind; setIntent(kind); if (kind === 'accept' || intent === 'decline') handleSubmit(() => setConfirm(kind), () => toast.error('Please fix the highlighted fields.'))(); };
  const [vals, setVals] = useState(null);
  const submit = async () => {
    setBusy(true);
    try {
      await respond(sid, e.id, { response: confirm === 'accept' ? 'accepted' : 'declined', answers: vals?.answers ?? {}, declineReason: vals?.reason ?? '' });
      toast.success(confirm === 'accept' ? 'Invitation accepted.' : 'Invitation declined.');
    } catch (er) { toast.error(er.message); } finally { setBusy(false); setConfirm(null); }
  };
  const doWithdraw = async () => { setWithdrawing(true); try { await withdraw(sid, e.id); toast.success('Response withdrawn.'); } catch (er) { toast.error(er.message); } finally { setWithdrawing(false); } };
  const handleConfirmClick = (kind) => handleSubmit((v) => { setVals(v); setConfirm(kind); }, () => toast.error('Please fix the highlighted fields.'))();

  const banner = { postponed: [CalendarClock, 'warn', 'Event postponed'], cancelled: [Ban, 'danger', 'Event cancelled'], updated: [RefreshCw, 'info', 'Event updated'] }[e.status];
  const avail = dayInfo.state === 'system_assumed_unavailable' ? 'System-Assumed Unavailable' : statusMeta[dayInfo.day.status].label;

  return (
    <>
      <Link to="/events" className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />All events</Link>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Badge className="border-navy/20 bg-lavender-100 text-navy">{eventCategories[e.category]}</Badge>
        {e.priority === 'mandatory' && <Badge className="border-rose-300 bg-rose-50 text-rose-800">Mandatory</Badge>}
        <StatusBadge kind={e.status} /><StatusBadge kind={inv.response} />
      </div>
      <h1 className="mb-4 text-2xl font-extrabold sm:text-3xl">{e.title}</h1>
      {banner && <Notice tone={banner[1]} icon={banner[0]} title={banner[2]} className="mb-4">{e.statusNote}{e.originalDate && ` (Original date: ${fmtDate(e.originalDate)}.)`}</Notice>}
      <div className="mb-4"><ConflictWarning conflicts={conflicts} /></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card>
            <CardHeader title="Details" />
            <p className="mb-4 text-sm text-ink">{e.description}</p>
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <Row icon={CalendarDays} k="Date">{fmtDate(e.date)}</Row>
              <Row icon={Clock} k="Time">{fmtTimeRange(e.startTime, e.endTime)}</Row>
              <Row icon={e.mode === 'online' ? Video : MapPin} k={e.mode === 'online' ? 'Online meeting' : 'Venue'}>{e.mode === 'online' ? e.meetingInfo ?? 'Details to follow' : e.venue}</Row>
              <Row icon={Users} k="Organiser">{e.organizer.name} · {e.organizer.role}</Row>
              <Row icon={Users} k="Who it’s for">{e.audience.label}</Row>
              {e.responseDeadline && <Row icon={Clock} k="Respond by">{fmtInstant(Date.parse(e.responseDeadline))}</Row>}
              {e.support?.email && <Row icon={Mail} k="Support"><a className="text-brand-700 underline" href={`mailto:${e.support.email}`}>{e.support.email}</a></Row>}
              {e.support?.phone && <Row icon={Phone} k="Phone">{e.support.phone}</Row>}
            </dl>
            {e.category === 'physical_verification' && <Notice tone="info" icon={Info} className="mt-4">This physical verification event is shown because the mock eligibility data marks you as available for this date. You cannot change eligibility yourself.</Notice>}
          </Card>

          {inv.response === 'accepted' && e.status !== 'cancelled' && appConfig.features.ics && (
            <Button variant="outline" onClick={() => { download(`${e.id}.ics`, buildIcs([item], nowMs), 'text/calendar;charset=utf-8'); toast.success('Calendar file downloaded.'); }}><CalendarPlus className="h-4 w-4" />Add to my calendar (.ics)</Button>
          )}

          {canGiveFeedback(e, inv) && <FeedbackForm sid={sid} eventId={e.id} existing={getFeedback(sid, e.id)} />}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader title="Your response" />
            <p className="mb-3 text-sm text-ink-soft">Current: <StatusBadge kind={inv.response} />{inv.respondedAt && <span className="block pt-1 text-xs">Responded {fmtInstant(inv.respondedAt)}</span>}</p>
            <Notice tone="neutral" icon={Info} className="mb-4">Your weekly availability for {fmtDate(e.date, { weekday: 'short', day: 'numeric', month: 'short' })}: <b>{avail}</b>. This does <b>not</b> accept the invitation – you must respond here.</Notice>

            {!can.ok ? <Notice tone="warn">{can.reason} Responses are closed.</Notice> : (
              <form onSubmit={(ev) => ev.preventDefault()} noValidate className="space-y-4">
                {intent !== 'decline' && e.questions.length > 0 && <p className="text-sm font-semibold text-navy">Questions from the organiser</p>}
                {intent !== 'decline' && e.questions.map((q) => (
                  <Field key={q.id} label={`${q.label}${q.required ? ' *' : ''}`} htmlFor={`q-${q.id}`} error={errors.answers?.[q.id]?.message}>
                    {q.type === 'textarea' && <textarea id={`q-${q.id}`} rows={3} className="field" {...register(`answers.${q.id}`)} />}
                    {q.type === 'text' && <input id={`q-${q.id}`} className="field" {...register(`answers.${q.id}`)} />}
                    {q.type === 'select' && <select id={`q-${q.id}`} className="field" {...register(`answers.${q.id}`)}><option value="">Select…</option>{q.options.map((o) => <option key={o}>{o}</option>)}</select>}
                    {q.type === 'radio' && <div role="radiogroup" className="space-y-1">{q.options.map((o) => <label key={o} className="flex min-h-[44px] items-center gap-2 rounded-xl border border-lavender-300 px-3 text-sm"><input type="radio" value={o} className="accent-brand-700" {...register(`answers.${q.id}`)} />{o}</label>)}</div>}
                    {q.type === 'checkbox' && <label className="flex min-h-[44px] items-center gap-2 text-sm"><input id={`q-${q.id}`} type="checkbox" className="h-5 w-5 accent-brand-700" {...register(`answers.${q.id}`)} />Yes</label>}
                  </Field>
                ))}
                {intent === 'decline' && <Field label={`Reason for declining${e.declineReasonRequired ? ' *' : ' (optional)'}`} htmlFor="reason" error={errors.reason?.message}><textarea id="reason" rows={3} className="field" {...register('reason')} /></Field>}

                <div className="grid grid-cols-2 gap-2">
                  {intent === 'decline' ? (
                    <>
                      <Button variant="outline" onClick={() => { intentRef.current = null; setIntent(null); }}><Undo2 className="h-4 w-4" />Back</Button>
                      <Button variant="danger" onClick={() => { intentRef.current = 'decline'; handleConfirmClick('decline'); }}>Confirm decline</Button>
                    </>
                  ) : (
                    <>
                      <Button onClick={() => { intentRef.current = 'accept'; handleConfirmClick('accept'); }}>{inv.response === 'accepted' ? 'Update answers' : 'Accept'}</Button>
                      <Button variant="secondary" onClick={() => start('decline')}>Decline</Button>
                    </>
                  )}
                </div>
              </form>
            )}
            {inv.response === 'accepted' && e.allowWithdraw && can.ok && <Button variant="ghost" size="sm" className="mt-3 w-full" onClick={doWithdraw} loading={withdrawing}>Withdraw my acceptance</Button>}
          </Card>
        </div>
      </div>

      <ConfirmDialog open={!!confirm} loading={busy} onCancel={() => setConfirm(null)} onConfirm={submit} tone={confirm === 'decline' ? 'danger' : 'primary'}
        title={confirm === 'accept' ? 'Accept this invitation?' : 'Decline this invitation?'} description={`${e.title} · ${fmtDate(e.date)}`} confirmLabel={confirm === 'accept' ? 'Yes, accept' : 'Yes, decline'}>
        {conflicts.length > 0 && confirm === 'accept' && <p className="text-sm text-amber-800">Heads up: this may conflict with another accepted event. You can still accept.</p>}
      </ConfirmDialog>
    </>
  );
}

const Row = ({ icon: I, k, children }) => <div className="flex gap-2"><I className="mt-0.5 h-4 w-4 shrink-0 text-brand-700" aria-hidden /><div><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{children}</dd></div></div>;

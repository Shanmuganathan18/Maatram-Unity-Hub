import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Bell, CalendarCheck, CalendarDays, CheckCircle2, History, Sparkles, TriangleAlert, UserCheck, Ticket } from 'lucide-react';
import { Avatar, Badge, Button, Card, CardHeader, EmptyState, LinkButton, Notice, Progress, StatusBadge, TextLink } from '../components/ui';
import DeadlineBanner from '../components/availability/DeadlineBanner';
import WeekSnapshot from '../components/dashboard/WeekSnapshot';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { defaultPlanningWeek, getWeekInfo } from '../services/availabilityService';
import { getAcceptedUpcoming, getConflicts, getEventsForStudent, isPast, respond } from '../services/eventService';
import { listNotifications, markAllRead, markRead } from '../services/notificationService';
import { getCompleteness } from '../services/profileService';
import { eventCategories, appConfig } from '../config/appConfig';
import { fmtDate, fmtDeadline, fmtRange, fmtTimeRange, isoWeekNumber, relativeTime, weekDays } from '../utils/dates';
import { notifIcon } from '../components/notifications/notifMeta';
import { useState } from 'react';
import { ConfirmDialog } from '../components/ui';

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { sid, student } = useAuth();
  const nav = useNavigate();
  useStore();
  const nowMs = useNow(1000);
  const ws = defaultPlanningWeek(nowMs);
  const info = getWeekInfo(sid, ws, nowMs);
  const all = getEventsForStudent(sid);
  const pending = all.filter((x) => x.invitation.response === 'pending' && !isPast(x.event, nowMs) && x.event.status !== 'cancelled');
  const accepted = getAcceptedUpcoming(sid).slice(0, 3);
  const notes = listNotifications(sid).slice(0, 4);
  const comp = getCompleteness(student);
  const [quick, setQuick] = useState(null); // {item, kind}
  const [busy, setBusy] = useState(false);

  const needsDetails = (e) => e.questions.length > 0;
  const answer = (item, kind) => {
    if (needsDetails(item.event) || (kind === 'decline' && item.event.declineReasonRequired)) { nav(`/events/${item.event.id}?respond=${kind}`); return; }
    setQuick({ item, kind });
  };
  const confirmQuick = async () => {
    setBusy(true);
    try { await respond(sid, quick.item.event.id, { response: quick.kind === 'accept' ? 'accepted' : 'declined' }); toast.success(quick.kind === 'accept' ? 'Invitation accepted.' : 'Invitation declined.'); } catch (e) { toast.error(e.message); } finally { setBusy(false); setQuick(null); }
  };
  const cta = info.state === 'submitted' ? 'Update Availability' : info.state === 'draft' ? 'Finish & Submit Availability' : 'Submit Availability';

  return (
    <div className="space-y-4">
      <Card className="flex items-center gap-3 bg-gradient-to-r from-brand-50 to-lavender-50">
        <Sparkles className="h-8 w-8 shrink-0 text-brand-700" aria-hidden />
        <div><h1 className="text-xl font-extrabold sm:text-2xl">Vanakkam, {student.name.split(' ')[0]}!</h1><p className="text-sm text-ink-soft">Week {isoWeekNumber(ws)} availability cycle is {info.open ? 'active' : 'closed'}. {info.open && 'Keep your availability up to date.'}</p></div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="flex gap-4">
            <Avatar student={student} size="h-16 w-16 text-xl" />
            <div className="min-w-0"><h2 className="truncate text-xl font-extrabold">{student.name}</h2><p className="text-sm text-ink-soft">{student.department} • Year {student.year}</p><p className="truncate text-sm text-ink-soft">{student.institution}</p>
              <div className="mt-2 flex flex-wrap gap-2"><Badge className="border-brand-300 bg-brand-50 text-brand-800">{student.zone}</Badge><Badge className="border-lavender-300 bg-lavender-100 text-navy">#{student.studentId}</Badge></div></div>
          </div>
        </Card>
        <Card>
          <CardHeader icon={UserCheck} title="Profile" action={<span className="text-sm font-bold text-navy">{comp.percent}%</span>} />
          <Progress value={comp.percent} label="Profile completeness" />
          {comp.missing.length ? <p className="mt-2 text-xs text-ink-soft">Missing: {comp.missing.map((m) => m.label).join(', ')}. <Link className="font-semibold text-brand-700 underline" to="/profile">Complete profile</Link></p> : <p className="mt-2 flex items-center gap-1 text-xs text-emerald-800"><CheckCircle2 className="h-4 w-4" />Your profile is complete.</p>}
        </Card>
      </div>

      <Card>
        <CardHeader icon={CalendarCheck} title="Weekly availability" action={<StatusBadge kind={info.state} />} />
        <p className="mb-3 text-sm text-ink-soft">{fmtRange(ws)}</p>
        <DeadlineBanner info={info} nowMs={nowMs} />
        <div className="mt-4"><WeekSnapshot info={info} days={weekDays(ws)} nowMs={nowMs} /></div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <LinkButton to={`/availability?week=${ws}`} size="lg" className="flex-1">{info.open ? cta : 'View this week'}</LinkButton>
          <LinkButton to="/availability-history" variant="outline" size="lg"><History className="h-5 w-5" />Availability history</LinkButton>
        </div>
      </Card>

      {info.open && <Notice tone="danger" icon={TriangleAlert} title="Important policy">Availability not submitted by {fmtDeadline(info.deadline)} will be marked <b>System-Assumed Unavailable</b>. Priority for events may be affected. <span className="text-xs">(Policy wording is a prototype assumption.)</span></Notice>}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={Ticket} title="Event invitations" action={<span className="rounded-full bg-navy px-2.5 py-0.5 text-xs font-bold text-white">{pending.length}</span>} />
          {pending.length === 0 ? <EmptyState icon={Ticket} title="No pending invitations" text="New invitations will appear here." /> : (
            <div className="space-y-3">{pending.slice(0, 3).map((x) => (
              <EventCard key={x.event.id} item={x} conflicts={appConfig.features.eventConflicts ? getConflicts(sid, x.event.id) : []}>
                <div className="grid grid-cols-2 gap-2"><Button size="sm" onClick={() => answer(x, 'accept')}>Accept</Button><Button size="sm" variant="secondary" onClick={() => answer(x, 'decline')}>Decline</Button></div>
              </EventCard>))}
              {pending.length > 3 && <TextLink to="/events">See all {pending.length} invitations</TextLink>}</div>)}
        </Card>

        <div className="space-y-4">
          <Card>
            <CardHeader icon={CalendarDays} title="Upcoming accepted events" action={<TextLink to="/events">All events</TextLink>} />
            {accepted.length === 0 ? <EmptyState icon={CalendarDays} title="No accepted events yet" text="Accept an invitation to see it here." /> : (
              <ul className="space-y-2">{accepted.map(({ event: e }) => <li key={e.id}><Link to={`/events/${e.id}`} className="block rounded-xl border border-lavender-200 p-3 hover:bg-lavender-50"><p className="font-semibold text-navy">{e.title}</p><p className="text-xs text-ink-soft">{fmtDate(e.date)} · {fmtTimeRange(e.startTime, e.endTime)} · {eventCategories[e.category]}</p></Link></li>)}</ul>)}
          </Card>
          <Card>
            <CardHeader icon={Bell} title="Recent updates" action={<button className="text-sm font-semibold text-brand-700" onClick={async () => { await markAllRead(sid); toast.success('All notifications marked as read.'); }}>Mark all read</button>} />
            {notes.length === 0 ? <EmptyState title="No notifications" /> : <ul className="divide-y divide-lavender-200">{notes.map((n) => { const I = notifIcon(n.category); return (
              <li key={n.id}><button onClick={() => { markRead(sid, n.id); if (n.link?.type === 'event') nav(`/events/${n.link.eventId}`); else if (n.link?.type === 'week') nav(`/availability?week=${n.link.weekStart}`); }} className="flex w-full gap-3 py-3 text-left"><I className="mt-0.5 h-5 w-5 shrink-0 text-brand-700" aria-hidden /><span className="min-w-0"><span className={`block text-sm ${n.read ? 'text-ink' : 'font-bold text-navy'}`}>{!n.read && <span className="sr-only">Unread: </span>}{n.title}</span><span className="text-xs text-ink-mute">{relativeTime(n.createdAt, nowMs)}</span></span></button></li>); })}</ul>}
            <div className="mt-2"><TextLink to="/notifications">View all notifications</TextLink></div>
          </Card>
        </div>
      </div>

      <ConfirmDialog open={!!quick} loading={busy} onCancel={() => setQuick(null)} onConfirm={confirmQuick} tone={quick?.kind === 'decline' ? 'danger' : 'primary'} title={quick?.kind === 'accept' ? 'Accept this invitation?' : 'Decline this invitation?'} description={quick ? `${quick.item.event.title} · ${fmtDate(quick.item.event.date)}` : ''} confirmLabel={quick?.kind === 'accept' ? 'Yes, accept' : 'Yes, decline'} />
    </div>
  );
}

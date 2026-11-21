import { useMemo, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { CalendarClock, ClipboardCheck, Flag } from 'lucide-react';
import { Card, FilterBar, PageHeader, SelectField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import * as av from '../services/availabilityService';
import { listEvents } from '../services/eventService';
import { appConfig, eventCategories, eventStatuses } from '../config/appConfig';
import { todayIST, weekStartOf, toYMD } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';
import { cn } from '../utils/cn';

const tone = { draft: ['#f1f5f9', '#475569'], published: ['#e0f2fe', '#075985'], invitations_open: ['#d1f5ec', '#0a5a4f'], in_progress: ['#ede9fe', '#5b21b6'], completed: ['#e2e8f0', '#334155'], postponed: ['#ffedd5', '#9a3412'], cancelled: ['#ffe4e6', '#9f1239'] };
const D = { category: '', institution: '', status: '', from: '', to: '', layer: 'both' };

export default function Calendar() {
  usePageTitle('Planning calendar');
  const { oid } = useAuth(); const v = useStore(); const nowMs = useNow(60000); const nav = useNavigate();
  const [f, setF] = useState(D); const set = (p) => setF((x) => ({ ...x, ...p }));
  const today = todayIST(nowMs);
  const events = listEvents(oid, { category: f.category, status: f.status, institutionId: f.institution, from: f.from, to: f.to });

  // availability density per date (% of students Available), for weeks we hold data for
  const density = useMemo(() => {
    const m = {};
    av.weekOptions(nowMs).forEach((ws) => { const { rows, days } = av.matrix(oid, ws, { institutionId: f.institution }, nowMs); days.forEach((d) => { const s = av.dayStats(rows, d); m[d] = { pct: s.availablePct, n: s.available, total: s.total, ws }; }); });
    return m;
  }, [oid, f.institution, nowMs, v]);

  const fcEvents = [];
  if (f.layer !== 'availability') events.forEach((e) => {
    const [bg, fg] = tone[e.status];
    fcEvents.push({ id: e.id, title: e.title, start: e.startTime ? `${e.date}T${e.startTime}:00` : e.date, end: e.startTime ? `${e.date}T${e.endTime}:00` : undefined, allDay: !e.startTime, backgroundColor: bg, borderColor: fg, textColor: fg, extendedProps: { kind: 'event', status: e.status } });
    const rd = e.responseDeadline?.slice(0, 10);
    if (rd && ['published', 'invitations_open'].includes(e.status)) fcEvents.push({ id: `rd-${e.id}`, title: `Response deadline: ${e.title}`, start: rd, allDay: true, backgroundColor: '#fff7ed', borderColor: '#c2410c', textColor: '#9a3412', extendedProps: { kind: 'deadline', eventId: e.id } });
    if (['in_progress', 'completed'].includes(e.status)) fcEvents.push({ id: `at-${e.id}`, title: `Attendance: ${e.title}`, start: e.date, allDay: true, backgroundColor: '#f5f3ff', borderColor: '#6d28d9', textColor: '#5b21b6', extendedProps: { kind: 'attendance', eventId: e.id } });
  });

  const content = (a) => {
    const { kind, status } = a.event.extendedProps; const Icon = kind === 'deadline' ? Flag : kind === 'attendance' ? ClipboardCheck : statusMeta[status]?.icon ?? CalendarClock;
    return <div className="flex w-full items-center gap-1 overflow-hidden px-1 py-0.5 text-[11px] font-semibold"><Icon size={11} aria-hidden /><span className="truncate">{a.timeText && kind === 'event' ? `${a.timeText} ` : ''}{a.event.title}</span></div>;
  };
  return (
    <>
      <PageHeader title="Planning calendar" subtitle="Events, deadlines and student availability density for your zone. Availability chips (“% free”) are guidance, not confirmations." />
      <FilterBar onClear={() => setF(D)} active={JSON.stringify(f) !== JSON.stringify(D)}>
        <SelectField id="cc" label="Category" value={f.category} onChange={(v) => set({ category: v })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
        <SelectField id="ci" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={av.institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} />
        <SelectField id="cs" label="Event status" value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(eventStatuses).map(([value, label]) => ({ value, label }))} />
        <SelectField id="cl" label="Show" all={null} value={f.layer} onChange={(v) => set({ layer: v })} options={[{ value: 'both', label: 'Events + availability density' }, { value: 'events', label: 'Events only' }, { value: 'availability', label: 'Availability density only' }]} />
        <div><label htmlFor="cf" className="label">From date</label><input id="cf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="ct" className="label">To date</label><input id="ct" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </FilterBar>
      <Card className="p-2 sm:p-4">
        <FullCalendar key={f.layer} plugins={[dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin]} initialView="dayGridMonth" firstDay={1} now={today} height="auto" dayMaxEvents={3} nowIndicator
          headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listMonth' }} buttonText={{ today: 'Today', dayGridMonth: 'Month', timeGridWeek: 'Week', listMonth: 'Agenda' }}
          events={fcEvents} eventContent={content} eventClick={(i) => nav(`/events/${i.event.extendedProps.eventId ?? i.event.id}`)}
          dateClick={(i) => nav(`/availability/${weekStartOf(i.dateStr.slice(0, 10))}?date=${i.dateStr.slice(0, 10)}`)}
          dayCellContent={(a) => { const d = toYMD(new Date(Date.UTC(a.date.getFullYear(), a.date.getMonth(), a.date.getDate()))); const x = density[d]; return (
            <div className="flex w-full items-start justify-between gap-1"><span>{a.dayNumberText}</span>{f.layer !== 'events' && x && x.total > 0 && a.view.type !== 'listMonth' && <span title={`${x.n} of ${x.total} students available`} className={cn('rounded px-1 text-[10px] font-bold', x.pct >= 70 ? 'bg-emerald-600 text-white' : x.pct >= 50 ? 'bg-emerald-300 text-emerald-950' : x.pct >= 30 ? 'bg-emerald-100 text-emerald-900' : 'bg-amber-100 text-amber-900')}>{x.pct}% free</span>}</div>); }} />
        <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-soft" aria-label="Legend">
          <li className="flex items-center gap-1"><span className="rounded bg-emerald-600 px-1 text-[10px] font-bold text-white">70% free</span>Availability density (% of students Available)</li>
          <li className="flex items-center gap-1"><CalendarClock size={12} />Event (colour + status icon)</li><li className="flex items-center gap-1"><Flag size={12} />Response deadline</li><li className="flex items-center gap-1"><ClipboardCheck size={12} />Attendance day</li>
        </ul>
        <p className="mt-1 text-xs text-ink-mute">Click an event to open it; click a date to see the availability of that day. Availability exists only for weeks held in the prototype ({appConfig.weeksBack} past, {appConfig.weeksAhead} ahead).</p>
      </Card>
    </>
  );
}

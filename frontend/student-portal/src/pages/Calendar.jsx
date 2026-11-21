import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { Link } from 'react-router-dom';
import { CalendarCheck, Lock } from 'lucide-react';
import { Card, CardHeader, LinkButton, Notice, PageHeader, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { getDayInfo, describeDay } from '../services/availabilityService';
import { addDays, fmtDate, fmtRange, isoWeekNumber, todayIST } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';

// Per-date display state: combines explicit answer with week state. Never colour-only (icon + text).
const dayState = (i) => {
  if (i.state === 'system_assumed_unavailable') return 'system_assumed_unavailable';
  if (i.state === 'locked') return i.day.status === 'none' ? 'locked' : i.day.status;
  if (i.state === 'not_started') return 'none';
  return i.day.status;
};
const palette = { available: ['#d1fae5', '#065f46'], unavailable: ['#ffe4e6', '#9f1239'], none: ['#f1f5f9', '#475569'], locked: ['#e2e8f0', '#1e293b'], system_assumed_unavailable: ['#ffedd5', '#9a3412'] };

export default function Calendar() {
  usePageTitle('My availability calendar');
  const { sid } = useAuth();
  useStore();
  const nowMs = useNow(30000);
  const today = todayIST(nowMs);
  const [sel, setSel] = useState(today);
  const [range, setRange] = useState(null);

  // Build one event per visible date (computed from FullCalendar's visible range).
  const events = [];
  if (range) for (let d = range.start; d < range.end; d = addDays(d, 1)) {
    const i = getDayInfo(sid, d, nowMs);
    if (i.state === 'not_started' && d < today) continue;
    events.push({ id: d, start: d, allDay: true, extendedProps: { s: dayState(i), draft: i.state === 'draft', locked: !i.open } });
  }
  const info = getDayInfo(sid, sel, nowMs);
  const st = dayState(info);

  return (
    <>
      <PageHeader title="My availability calendar" subtitle="Only your own availability is shown. Select a date for details." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="card p-2 sm:p-4 lg:col-span-2">
          <FullCalendar plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" firstDay={1} now={today} height="auto" fixedWeekCount={false}
            headerToolbar={{ left: 'prev,next today', center: 'title', right: 'dayGridMonth,dayGridWeek' }} buttonText={{ today: 'Today', dayGridMonth: 'Month', dayGridWeek: 'Week' }}
            datesSet={(a) => setRange({ start: a.startStr.slice(0, 10), end: a.endStr.slice(0, 10) })} events={events}
            dateClick={(a) => setSel(a.dateStr)} eventClick={(a) => setSel(a.event.id)}
            dayCellClassNames={(a) => (a.date && `${a.date.getFullYear()}-${String(a.date.getMonth() + 1).padStart(2, '0')}-${String(a.date.getDate()).padStart(2, '0')}` === sel ? ['is-selected'] : [])}
            eventContent={(a) => { const { s, draft, locked } = a.event.extendedProps; const M = statusMeta[s]; const I = M.icon; const [bg, fg] = palette[s]; return (
              <div className="flex w-full items-center justify-center gap-1 rounded px-1 py-0.5 text-[11px] font-semibold sm:justify-start" style={{ background: bg, color: fg }} title={`${M.label}${draft ? ' (draft)' : ''}`}>
                <I size={12} aria-hidden /><span className="hidden truncate sm:inline">{s === 'system_assumed_unavailable' ? 'Assumed' : M.label}{draft && ' · Draft'}</span>{locked && s !== 'locked' && s !== 'system_assumed_unavailable' && <Lock size={10} aria-hidden />}<span className="sr-only">{M.label}{draft ? ', draft' : ''}{locked ? ', locked' : ''}</span></div>); }} />
          <ul className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-ink-soft sm:grid-cols-3" aria-label="Legend">
            {['available', 'unavailable', 'none', 'draft', 'locked', 'system_assumed_unavailable'].map((k) => { const I = statusMeta[k].icon; return <li key={k} className="flex items-center gap-1"><I size={14} aria-hidden />{k === 'none' ? 'Not submitted / not selected' : k === 'draft' ? 'Draft (shown as “· Draft”)' : statusMeta[k].label}</li>; })}
          </ul>
        </div>

        <Card className="h-fit">
          <CardHeader icon={CalendarCheck} title={fmtDate(sel, { weekday: 'long', day: 'numeric', month: 'long' })} />
          <div className="space-y-3 text-sm">
            <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={st} />{info.state === 'draft' && <StatusBadge kind="draft" />}{!info.open && <StatusBadge kind="locked" />}</div>
            <p>{info.state === 'system_assumed_unavailable' ? 'No valid submission was received for this week, so it is System-Assumed Unavailable (not an answer you gave).' : info.day.status === 'none' ? 'You haven’t selected a status for this date.' : `Your answer: ${describeDay(info.day)}.`}</p>
            <p className="text-ink-soft">Week {isoWeekNumber(info.weekStart)} · {fmtRange(info.weekStart)}<br />Week status: {statusMeta[info.state].label}</p>
            {info.open ? <LinkButton to={`/availability?week=${info.weekStart}`} className="w-full">Edit this week</LinkButton> : <Notice tone="neutral" icon={Lock}>This week is locked and read-only. <Link className="font-semibold underline" to={`/availability?week=${info.weekStart}`}>View week</Link></Notice>}
          </div>
        </Card>
      </div>
    </>
  );
}

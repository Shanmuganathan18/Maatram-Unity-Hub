import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, XCircle, Hourglass, Ban, CalendarClock } from 'lucide-react';
import { appConfig } from '../../config/appConfig';
import { todayIST } from '../../utils/dates';

const look = (event, response) => {
  if (event.status === 'cancelled') return { Icon: Ban, label: 'Cancelled', bg: '#ffe4e6', fg: '#9f1239' };
  if (event.status === 'postponed') return { Icon: CalendarClock, label: 'Postponed', bg: '#ffedd5', fg: '#9a3412' };
  if (response === 'accepted') return { Icon: CheckCircle2, label: 'Accepted', bg: '#d1fae5', fg: '#065f46' };
  if (response === 'declined') return { Icon: XCircle, label: 'Declined', bg: '#f1f5f9', fg: '#475569' };
  return { Icon: Hourglass, label: 'Pending', bg: '#fef3c7', fg: '#92400e' };
};

export default function EventCalendar({ items, nowMs }) {
  const nav = useNavigate();
  const events = items.map(({ event: e, invitation }) => ({
    id: e.id, title: e.title, start: e.startTime ? `${e.date}T${e.startTime}:00` : e.date, end: e.startTime && e.endTime ? `${e.date}T${e.endTime}:00` : undefined, allDay: !e.startTime,
    extendedProps: look(e, invitation.response),
  }));
  return (
    <div className="card p-2 sm:p-4">
      <FullCalendar plugins={[dayGridPlugin, listPlugin, interactionPlugin]} initialView="dayGridMonth" firstDay={1} now={todayIST(nowMs)} timeZone="local" height="auto"
        headerToolbar={{ left: 'prev,next', center: 'title', right: 'dayGridMonth,listMonth' }} buttonText={{ dayGridMonth: 'Month', listMonth: 'List' }} events={events} dayMaxEvents={3}
        eventClick={(i) => nav(`/events/${i.event.id}`)}
        eventContent={(a) => { const { Icon, label, bg, fg } = a.event.extendedProps; return (
          <div className="flex w-full items-center gap-1 overflow-hidden rounded px-1 py-0.5 text-[11px] font-semibold" style={{ background: bg, color: fg }} title={`${label}: ${a.event.title}`}>
            <Icon size={12} aria-hidden /><span className="sr-only">{label}:</span><span className="truncate">{a.event.title}</span></div>); }} />
      <ul className="mt-3 flex flex-wrap gap-3 text-xs text-ink-soft" aria-label="Legend">
        {['Pending', 'Accepted', 'Declined', 'Postponed', 'Cancelled'].map((l) => <li key={l} className="flex items-center gap-1">{l === 'Pending' ? <Hourglass size={12} /> : l === 'Accepted' ? <CheckCircle2 size={12} /> : l === 'Declined' ? <XCircle size={12} /> : l === 'Cancelled' ? <Ban size={12} /> : <CalendarClock size={12} />}{l}</li>)}
      </ul>
      <p className="sr-only">{appConfig.appName} event calendar</p>
    </div>
  );
}

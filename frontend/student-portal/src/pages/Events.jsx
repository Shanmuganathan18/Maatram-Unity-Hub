import { useState } from 'react';
import { CalendarDays, List, Ticket } from 'lucide-react';
import { Button, EmptyState, PageHeader } from '../components/ui';
import EventCard from '../components/events/EventCard';
import EventCalendar from '../components/calendar/EventCalendar';
import ScheduleExport from '../components/events/ScheduleExport';
import PrintableSchedule from '../components/events/PrintableSchedule';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle } from '../hooks/useStore';
import { getConflicts, getEventsForStudent, isPast } from '../services/eventService';
import { appConfig, eventCategories } from '../config/appConfig';
import { cn } from '../utils/cn';

const filters = [
  { id: 'upcoming', label: 'Upcoming', fn: (x, n) => !isPast(x.event, n) },
  { id: 'past', label: 'Past', fn: (x, n) => isPast(x.event, n) },
  { id: 'pending', label: 'Pending response', fn: (x, n) => x.invitation.response === 'pending' && !isPast(x.event, n) && x.event.status !== 'cancelled' },
  { id: 'accepted', label: 'Accepted', fn: (x) => x.invitation.response === 'accepted' },
  { id: 'declined', label: 'Declined', fn: (x) => x.invitation.response === 'declined' },
];

export default function Events() {
  usePageTitle('Events & invitations');
  const { sid, student } = useAuth();
  const nowMs = useNow(30000);
  const [f, setF] = useState('upcoming');
  const [cat, setCat] = useState('all');
  const [view, setView] = useState('list');
  const all = getEventsForStudent(sid);
  const cur = filters.find((x) => x.id === f);
  let list = all.filter((x) => cur.fn(x, nowMs) && (cat === 'all' || x.event.category === cat));
  if (f === 'past') list = [...list].reverse();

  return (
    <>
      <PageHeader title="Events & invitations" subtitle="Events targeted to you. Responding here is separate from your weekly availability." actions={<ScheduleExport sid={sid} />} />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter events">
          {filters.map((x) => <button key={x.id} role="tab" aria-selected={f === x.id} onClick={() => setF(x.id)} className={cn('min-h-[40px] rounded-pill border px-4 text-sm font-semibold', f === x.id ? 'border-navy bg-navy text-white' : 'border-lavender-300 bg-white text-navy')}>{x.label} <span className="opacity-70">({all.filter((y) => x.fn(y, nowMs)).length})</span></button>)}
        </div>
        <label htmlFor="cat" className="sr-only">Category</label>
        <select id="cat" className="field max-w-[200px]" value={cat} onChange={(e) => setCat(e.target.value)}><option value="all">All categories</option>{Object.entries(eventCategories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={view === 'list' ? 'navy' : 'outline'} onClick={() => setView('list')} aria-pressed={view === 'list'}><List className="h-4 w-4" />List</Button>
          <Button size="sm" variant={view === 'calendar' ? 'navy' : 'outline'} onClick={() => setView('calendar')} aria-pressed={view === 'calendar'}><CalendarDays className="h-4 w-4" />Calendar</Button>
        </div>
      </div>

      {view === 'calendar' ? <EventCalendar items={all.filter((x) => cat === 'all' || x.event.category === cat)} nowMs={nowMs} />
        : list.length === 0 ? <EmptyState icon={Ticket} title="No events here" text={f === 'pending' ? 'You have no invitations waiting for a response.' : 'Nothing matches this filter right now.'} />
          : <div className="grid gap-4 md:grid-cols-2">{list.map((x) => <EventCard key={x.event.id} item={x} conflicts={appConfig.features.eventConflicts ? getConflicts(sid, x.event.id) : []} />)}</div>}
      <PrintableSchedule sid={sid} name={student.name} />
    </>
  );
}

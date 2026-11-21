import { Link } from 'react-router-dom';
import { CalendarPlus, Ticket } from 'lucide-react';
import { Card, DataTable, EmptyState, FilterBar, LinkButton, PageHeader, SearchInput, SelectField, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listEvents } from '../services/eventService';
import { institutionOptions } from '../services/availabilityService';
import { eventCategories, eventStatuses } from '../config/appConfig';
import { fmtDate, fmtTimeRange } from '../utils/dates';

const D = { q: '', category: '', status: '', institution: '', from: '', to: '' };
export default function Events() {
  usePageTitle('Events');
  const { oid } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D);
  const rows = listEvents(oid, { q: f.q, category: f.category, status: f.status, institutionId: f.institution, from: f.from, to: f.to });
  const cols = [
    { key: 't', label: 'Event', render: (e) => <><Link to={`/events/${e.id}`} className="font-semibold text-navy hover:underline">{e.title}</Link><span className="block text-xs text-ink-mute">{eventCategories[e.category]}</span></> },
    { key: 'd', label: 'Date & time', render: (e) => <>{fmtDate(e.date)}<span className="block text-xs text-ink-mute">{fmtTimeRange(e.startTime, e.endTime)}</span></> },
    { key: 'i', label: 'Target institutions', render: (e) => <span className="line-clamp-2 max-w-[220px] text-xs">{e.institutionNames.join(', ')}</span> },
    { key: 'ts', label: 'Target', render: (e) => e.targetStudents }, { key: 'inv', label: 'Invited', render: (e) => e.stats.invited },
    { key: 'a', label: 'Accepted', render: (e) => e.stats.accepted }, { key: 'dc', label: 'Declined', render: (e) => e.stats.declined }, { key: 'p', label: 'Pending', render: (e) => e.stats.pending },
    { key: 's', label: 'Status', render: (e) => <StatusBadge kind={e.status} /> },
  ];
  return (
    <>
      <PageHeader title="Events" subtitle="Create and manage events for your zone." actions={<LinkButton to="/events/create"><CalendarPlus className="h-4 w-4" />Create event</LinkButton>} />
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="eq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Event title" />
        <SelectField id="ec" label="Category" value={f.category} onChange={(v) => set({ category: v })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
        <SelectField id="es" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(eventStatuses).map(([value, label]) => ({ value, label }))} />
        <SelectField id="ei" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} />
        <div><label htmlFor="ef" className="label">From</label><input id="ef" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="et" className="label">To</label><input id="et" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </FilterBar>
      <Card className="p-0 sm:p-0"><DataTable caption="Events" columns={cols} rows={rows} empty={<EmptyState icon={Ticket} title="No events found" text="Create an event or adjust the filters." action={<LinkButton to="/events/create" variant="secondary">Create event</LinkButton>} />}
        renderCard={(e) => <div><div className="flex justify-between gap-2"><Link to={`/events/${e.id}`} className="font-bold text-navy">{e.title}</Link><StatusBadge kind={e.status} /></div><p className="text-xs text-ink-soft">{eventCategories[e.category]} · {fmtDate(e.date)} · {fmtTimeRange(e.startTime, e.endTime)}</p><p className="mt-1 text-xs text-ink-mute">{e.institutionNames.join(', ')}</p><p className="mt-2 text-sm">{e.stats.invited} invited · {e.stats.accepted} accepted · {e.stats.declined} declined · {e.stats.pending} pending</p></div>} /></Card>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, FileSpreadsheet } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterBar, PageHeader, Pagination, SearchInput, SelectField, StatusBadge } from '../components/ui';
import BulkImportModal from '../components/common/BulkImportModal';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { approvalEnabled, listEvents, officersForFilter } from '../services/eventService';
import { studentFilterOptions } from '../services/studentService';
import { eventCategories, eventStatuses } from '../config/appConfig';
import { fmtDate } from '../utils/dates';

const D = { q: '', zone: '', officer: '', institution: '', category: '', status: '', from: '', to: '', page: '1' };

const eventImportColumns = [
  { key: 'title', label: 'Event Title', required: true },
  { key: 'date', label: 'Event Date (YYYY-MM-DD)', required: true },
  { key: 'category', label: 'Category' },
  { key: 'startTime', label: 'Start Time' },
  { key: 'endTime', label: 'End Time' },
  { key: 'location', label: 'Location' },
  { key: 'zone', label: 'Zone' },
  { key: 'description', label: 'Description' },
];

const sampleEvents = [
  {
    title: 'Industry Readiness & Soft Skills Workshop',
    date: '2026-11-20',
    category: 'TRAINING',
    startTime: '09:30',
    endTime: '16:30',
    location: 'Coimbatore CIT Auditorium',
    zone: 'Zone B',
    description: 'Mandatory mock interview & communication training session.',
  },
  {
    title: 'Career Guidance & Resume Review',
    date: '2026-11-28',
    category: 'MENTORING',
    startTime: '10:00',
    endTime: '13:00',
    location: 'Online via Zoom',
    zone: 'Zone A',
    description: 'One-on-one portfolio critique with corporate mentors.',
  },
];

export default function Events() {
  usePageTitle('Events');
  const { aid } = useAuth();
  const { refresh } = useStore();
  const [f, set, clear, active] = useQueryState(D);
  const [importOpen, setImportOpen] = useState(false);
  const o = studentFilterOptions();
  const appr = approvalEnabled();

  const all = listEvents(aid, { q: f.q, zoneId: f.zone, officerId: f.officer, institutionId: f.institution, category: f.category, status: f.status, from: f.from, to: f.to });
  const pages = Math.max(1, Math.ceil(all.length / 12));
  const page = Math.min(Number(f.page), pages);
  const rows = all.slice((page - 1) * 12, page * 12);
  const cols = [
    { key: 'id', label: 'ID', render: (e) => <span className="font-mono text-xs">{e.id}</span> },
    { key: 't', label: 'Event', render: (e) => <><Link to={`/events/${e.id}`} className="font-semibold text-navy hover:underline">{e.title}</Link><span className="block text-xs text-ink-mute">{eventCategories[e.category]}</span></> },
    { key: 'z', label: 'Zone', render: (e) => e.zoneLabel },
    { key: 'o', label: 'Officer', render: (e) => e.officer },
    { key: 'i', label: 'Target institutions', className: 'hidden 2xl:table-cell', render: (e) => <span className="line-clamp-2 max-w-[200px] text-xs">{e.institutionNames.join(', ')}</span> },
    { key: 'd', label: 'Date', render: (e) => fmtDate(e.date) },
    { key: 's', label: 'Status', render: (e) => <StatusBadge kind={e.status} /> },
    ...(appr ? [{ key: 'ap', label: 'Approval', render: (e) => <StatusBadge kind={e.approvalStatus === 'pending' ? 'pending' : e.approvalStatus} /> }] : []),
    { key: 'inv', label: 'Invited', render: (e) => e.stats.invited },
    { key: 'a', label: 'Accepted', render: (e) => e.stats.accepted },
    { key: 'dc', label: 'Declined', render: (e) => e.stats.declined },
    { key: 'p', label: 'Pending', render: (e) => e.stats.pending },
    { key: 'at', label: 'Present', render: (e) => e.stats.present },
  ];

  return (
    <>
      <PageHeader
        title="Events"
        subtitle="All events across zones. Admins oversee and can bulk schedule events."
        actions={
          <Button variant="secondary" onClick={() => setImportOpen(true)}>
            <FileSpreadsheet className="h-4 w-4" />
            Bulk Import Events
          </Button>
        }
      />
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="eq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Event title" />
        <SelectField id="ez" label="Zone" value={f.zone} onChange={(v) => set({ zone: v })} options={o.zones} />
        <SelectField id="eo" label="Officer" value={f.officer} onChange={(v) => set({ officer: v })} options={officersForFilter()} />
        <SelectField id="ei" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={o.institutions.filter((i) => !f.zone || i.zoneId === f.zone)} />
        <SelectField id="ec" label="Category" value={f.category} onChange={(v) => set({ category: v })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
        <SelectField id="es" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={Object.entries(eventStatuses).map(([value, label]) => ({ value, label }))} />
        <div><label htmlFor="ef" className="label">From</label><input id="ef" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="et" className="label">To</label><input id="et" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable caption="Events" columns={cols} rows={rows} empty={<EmptyState icon={Ticket} title="No events found" />}
          renderCard={(e) => <div><div className="flex justify-between gap-2"><Link to={`/events/${e.id}`} className="font-bold text-navy">{e.title}</Link><StatusBadge kind={e.status} /></div><p className="text-xs text-ink-soft">{e.zoneLabel} · {e.officer} · {fmtDate(e.date)}</p><p className="mt-1 text-sm">{e.stats.invited} invited · {e.stats.accepted} accepted · {e.stats.pending} pending</p></div>} />
        <Pagination page={page} pages={pages} total={all.length} pageSize={12} onPage={(p) => set({ page: p })} />
      </Card>
      <BulkImportModal
        open={importOpen}
        onOpenChange={setImportOpen}
        title="Bulk Import Scheduled Events"
        entityName="Events"
        columns={eventImportColumns}
        sampleRows={sampleEvents}
        endpoint="/events/batch"
        onSuccess={() => {
          if (refresh) refresh();
        }}
      />
    </>
  );
}

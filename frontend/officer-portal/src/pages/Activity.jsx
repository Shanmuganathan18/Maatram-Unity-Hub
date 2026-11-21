import { Link } from 'react-router-dom';
import { ScrollText } from 'lucide-react';
import { Card, DataTable, EmptyState, FilterBar, Notice, PageHeader, Pagination, SearchInput, SelectField } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { listActivity } from '../services/activityService';
import { fmtInstant } from '../utils/dates';

export const activityTypes = { event_created: 'Event created', event_updated: 'Event updated', event_published: 'Event published', event_postponed: 'Event postponed', event_cancelled: 'Event cancelled', invitation_sent: 'Invitation sent', attendance_updated: 'Attendance updated', student_updated: 'Student record updated', institution_updated: 'Institution record updated', report_exported: 'Report exported', profile_updated: 'Profile updated' };
const D = { q: '', type: '', from: '', to: '', page: '1' };
const link = (r) => (!r ? '—' : r.type === 'event' ? <Link className="text-brand-700 underline" to={`/events/${r.id}`}>{r.label}</Link> : r.label);

export default function Activity() {
  usePageTitle('Activity log');
  const { oid } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D);
  const all = listActivity(oid, { q: f.q, type: f.type, from: f.from, to: f.to }); const pages = Math.max(1, Math.ceil(all.length / 10)); const page = Math.min(Number(f.page), pages);
  const rows = all.slice((page - 1) * 10, page * 10);
  return (
    <>
      <PageHeader title="Activity log" subtitle="Audit trail of actions in your zone. Read-only: officers cannot edit or delete history." />
      <FilterBar onClear={clear} active={active}>
        <SearchInput id="acq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Description, event, person" />
        <SelectField id="act" label="Activity type" value={f.type} onChange={(v) => set({ type: v })} options={Object.entries(activityTypes).map(([value, label]) => ({ value, label }))} />
        <div><label htmlFor="acf" className="label">From date</label><input id="acf" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="act2" className="label">To date</label><input id="act2" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable caption="Activity log" rows={rows} empty={<EmptyState icon={ScrollText} title="No activity found" />}
          columns={[{ key: 't', label: 'Activity', render: (a) => <b className="text-navy">{activityTypes[a.type] ?? a.type}</b> }, { key: 'd', label: 'Description', render: (a) => a.description }, { key: 'r', label: 'Related', render: (a) => link(a.related) }, { key: 'p', label: 'Performed by', render: (a) => a.actorName }, { key: 'w', label: 'Date & time', render: (a) => fmtInstant(a.at) }]}
          renderCard={(a) => <div><p className="font-bold text-navy">{activityTypes[a.type] ?? a.type}</p><p className="text-sm">{a.description}</p><p className="text-xs text-ink-soft">{link(a.related)}</p><p className="text-xs text-ink-mute">{a.actorName} · {fmtInstant(a.at)}</p></div>} />
        <Pagination page={page} pages={pages} total={all.length} pageSize={10} onPage={(p) => set({ page: p })} />
      </Card>
      <Notice tone="neutral" className="mt-4">In the backend phase, every important action will be written as an auditable event on the server.</Notice>
    </>
  );
}

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { History } from 'lucide-react';
import { Button, Card, EmptyState, LinkButton, Modal, PageHeader, StatusBadge, Notice } from '../components/ui';
import DayCard from '../components/availability/DayCard';
import EditHistory from '../components/availability/EditHistory';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { emptyDays, getHistory } from '../services/availabilityService';
import { fmtInstant, fmtRange, isoWeekNumber, weekDays } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';

export default function AvailabilityHistory() {
  usePageTitle('Availability history');
  const { sid } = useAuth();
  useStore();
  const nowMs = useNow(30000);
  const [status, setStatus] = useState('all');
  const [year, setYear] = useState('all');
  const [weekNo, setWeekNo] = useState('');
  const [detail, setDetail] = useState(null);
  const all = getHistory(sid, nowMs);
  const years = [...new Set(all.map((h) => h.weekStart.slice(0, 4)))];
  const list = all.filter((h) => (status === 'all' || h.state === status) && (year === 'all' || h.weekStart.startsWith(year)) && (!weekNo || isoWeekNumber(h.weekStart) === Number(weekNo)));

  return (
    <>
      <PageHeader title="Availability history" subtitle="Your weekly submissions. Locked weeks are read-only." />
      <div className="mb-4 grid gap-2 sm:grid-cols-3">
        <div><label htmlFor="hs" className="label">Status</label><select id="hs" className="field" value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option>{['not_started', 'draft', 'submitted', 'locked', 'system_assumed_unavailable'].map((s) => <option key={s} value={s}>{statusMeta[s].label}</option>)}</select></div>
        <div><label htmlFor="hy" className="label">Year</label><select id="hy" className="field" value={year} onChange={(e) => setYear(e.target.value)}><option value="all">All years</option>{years.map((y) => <option key={y}>{y}</option>)}</select></div>
        <div><label htmlFor="hw" className="label">Week number</label><input id="hw" type="number" min="1" max="53" className="field" placeholder="e.g. 44" value={weekNo} onChange={(e) => setWeekNo(e.target.value)} /></div>
      </div>
      {list.length === 0 ? <EmptyState icon={History} title="No weeks match" text="Try clearing the filters." action={<Button variant="secondary" onClick={() => { setStatus('all'); setYear('all'); setWeekNo(''); }}>Clear filters</Button>} /> : (
        <div className="space-y-3">{list.map((h) => (
          <Card key={h.weekStart} className="flex flex-col gap-3 md:flex-row md:items-center">
            <div className="md:w-56"><p className="font-bold text-navy">{fmtRange(h.weekStart)}</p><p className="text-xs text-ink-soft">Week {isoWeekNumber(h.weekStart)}</p><div className="mt-1"><StatusBadge kind={h.state} /></div></div>
            <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-1 text-sm lg:grid-cols-4">
              <div><dt className="text-xs text-ink-mute">Submitted</dt><dd>{h.record?.submittedAt ? fmtInstant(h.record.submittedAt) : '—'}</dd></div>
              <div><dt className="text-xs text-ink-mute">Last updated</dt><dd>{h.record?.status === 'submitted' ? fmtInstant(h.record.updatedAt) : '—'}</dd></div>
              <div><dt className="text-xs text-ink-mute">Available dates</dt><dd className="font-semibold">{h.state === 'system_assumed_unavailable' ? '0 (assumed)' : h.counts.available}</dd></div>
              <div><dt className="text-xs text-ink-mute">Marked unavailable</dt><dd className="font-semibold">{h.state === 'system_assumed_unavailable' ? '— (not answered)' : h.counts.unavailable}</dd></div>
            </dl>
            <div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => setDetail(h)}>View details</Button>{h.open && <LinkButton to={`/availability?week=${h.weekStart}`} size="sm">Edit</LinkButton>}</div>
          </Card>))}</div>)}

      <Modal open={!!detail} onOpenChange={(o) => !o && setDetail(null)} size="lg" title={detail ? `Week ${isoWeekNumber(detail.weekStart)} · ${fmtRange(detail.weekStart)}` : ''} description="Read-only details of this week’s submission">
        {detail && (
          <div className="space-y-4">
            <StatusBadge kind={detail.state} />
            {detail.state === 'system_assumed_unavailable' && <Notice tone="warn">No submission was received by the deadline{detail.record ? ' (a saved draft existed but was never submitted)' : ''}. This is System-Assumed Unavailable, not an explicit answer.</Notice>}
            {!detail.open && <p className="text-sm text-ink-soft">Locked – read only.</p>}
            <div className="grid gap-2 sm:grid-cols-2">{weekDays(detail.weekStart).map((d) => <DayCard key={d} date={d} day={(detail.record?.days ?? emptyDays(detail.weekStart))[d]} readOnly />)}</div>
            <h3 className="font-bold">Edit history</h3><EditHistory history={detail.record?.history} />
            {detail.open && <Link className="font-semibold text-brand-700 underline" to={`/availability?week=${detail.weekStart}`}>Open in planner</Link>}
          </div>)}
      </Modal>
    </>
  );
}

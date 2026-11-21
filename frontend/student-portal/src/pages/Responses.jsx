import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { ClipboardList } from 'lucide-react';
import { Button, Card, ConfirmDialog, EmptyState, LinkButton, PageHeader, StatusBadge } from '../components/ui';
import ScheduleExport from '../components/events/ScheduleExport';
import PrintableSchedule from '../components/events/PrintableSchedule';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { canRespond, getEventsForStudent, withdraw } from '../services/eventService';
import { fmtDate, fmtInstant } from '../utils/dates';

export default function Responses() {
  usePageTitle('My responses');
  const { sid, student } = useAuth();
  useStore();
  const nowMs = useNow(60000);
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState('all');
  const list = getEventsForStudent(sid).filter((x) => x.invitation.response !== 'pending' && (f === 'all' || x.invitation.response === f)).sort((a, b) => (b.invitation.respondedAt ?? 0) - (a.invitation.respondedAt ?? 0));

  const doWithdraw = async () => { setBusy(true); try { await withdraw(sid, target.event.id); toast.success('Response withdrawn.'); } catch (e) { toast.error(e.message); } finally { setBusy(false); setTarget(null); } };
  return (
    <>
      <PageHeader title="My responses" subtitle="Every invitation you have answered. Weekly availability is not shown here – it is a separate step." actions={<ScheduleExport sid={sid} />} />
      <div className="mb-4 flex flex-wrap gap-2" role="tablist" aria-label="Filter responses">{['all', 'accepted', 'declined', 'withdrawn'].map((x) => <button key={x} role="tab" aria-selected={f === x} onClick={() => setF(x)} className={`min-h-[44px] rounded-pill border px-4 text-sm font-semibold capitalize ${f === x ? 'border-navy bg-navy text-white' : 'border-lavender-300 bg-white text-navy'}`}>{x}</button>)}</div>
      {list.length === 0 ? <EmptyState icon={ClipboardList} title="No responses yet" text="Once you accept or decline an invitation it appears here." action={<LinkButton to="/events" variant="secondary">Go to events</LinkButton>} /> : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-lavender-200 bg-white md:block">
            <table className="w-full text-left text-sm"><thead className="bg-lavender-100 text-xs uppercase text-ink-soft"><tr>{['Event', 'Event date', 'My response', 'Responded', 'Event status', 'Action'].map((h) => <th key={h} scope="col" className="px-4 py-3">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-lavender-200">{list.map(({ event: e, invitation: i }) => (
                <tr key={e.id}><td className="px-4 py-3 font-semibold"><Link className="text-navy hover:underline" to={`/events/${e.id}`}>{e.title}</Link></td><td className="px-4 py-3">{fmtDate(e.date)}</td><td className="px-4 py-3"><StatusBadge kind={i.response} /></td><td className="px-4 py-3">{i.respondedAt ? fmtInstant(i.respondedAt) : '—'}</td><td className="px-4 py-3"><StatusBadge kind={e.status} /></td>
                  <td className="px-4 py-3"><Actions e={e} i={i} nowMs={nowMs} onWithdraw={() => setTarget({ event: e })} /></td></tr>))}</tbody></table>
          </div>
          <div className="space-y-3 md:hidden">{list.map(({ event: e, invitation: i }) => (
            <Card key={e.id}><div className="flex items-start justify-between gap-2"><Link to={`/events/${e.id}`} className="font-bold text-navy">{e.title}</Link><StatusBadge kind={i.response} /></div>
              <p className="mt-1 text-sm text-ink-soft">{fmtDate(e.date)} · <StatusBadge kind={e.status} /></p><p className="text-xs text-ink-mute">Responded {i.respondedAt ? fmtInstant(i.respondedAt) : '—'}</p><div className="mt-2"><Actions e={e} i={i} nowMs={nowMs} onWithdraw={() => setTarget({ event: e })} /></div></Card>))}</div>
        </>)}
      <ConfirmDialog open={!!target} loading={busy} onCancel={() => setTarget(null)} onConfirm={doWithdraw} tone="danger" title="Withdraw your acceptance?" description={target?.event.title} confirmLabel="Withdraw" />
      <PrintableSchedule sid={sid} name={student.name} />
    </>
  );
}

function Actions({ e, i, nowMs, onWithdraw }) {
  const can = canRespond(e, nowMs).ok;
  return (
    <div className="flex flex-wrap gap-2">
      {can && <LinkButton to={`/events/${e.id}`} size="sm" variant="outline">Change response</LinkButton>}
      {can && e.allowWithdraw && i.response === 'accepted' && <Button size="sm" variant="ghost" onClick={onWithdraw}>Withdraw</Button>}
      {!can && <span className="text-xs text-ink-mute">Closed</span>}
    </div>
  );
}

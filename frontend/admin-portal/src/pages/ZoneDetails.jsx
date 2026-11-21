import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Archive, Ban, CheckCircle2, Pencil, Trash2, Users } from 'lucide-react';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, Modal, Notice, StatCard, StatusBadge, EmptyState } from '../components/ui';
import { Back, KV, NotFoundCard } from '../components/layout/common';
import { Can } from '../components/layout/Gate';
import ZoneForm from '../components/zones/ZoneForm';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { deleteBlockedReason, getZoneDetail, setZoneStatus, updateZone, zoneStatusImpact } from '../services/zoneService';
import { eventStatuses } from '../config/appConfig';
import { fmtDate, fmtInstant } from '../utils/dates';
import { Building2, Percent, Ticket } from 'lucide-react';
import { toast } from 'sonner';

export default function ZoneDetails() {
  const { zoneId } = useParams(); const { aid } = useAuth(); useStore(); const [edit, setEdit] = useState(false); const [conf, setConf] = useState(null); const [run, busy] = useAction();
  const d = getZoneDetail(aid, zoneId); usePageTitle(d?.zone.name ?? 'Zone');
  if (!d) return <NotFoundCard what="Zone" to="/zones" />;
  const z = d.zone; const m = d.metrics; const impact = zoneStatusImpact(zoneId);
  const labelOf = { Inactive: 'Deactivate zone', Archived: 'Archive zone', Active: 'Activate zone' };
  return (<div className="space-y-4">
    <Back to="/zones">Zones</Back>
    <Card className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{z.name} • {z.region}</h1><p className="text-sm text-ink-soft">{z.code} · created {fmtDate(new Date(z.createdAt).toISOString().slice(0, 10))}</p><p className="mt-1 max-w-2xl text-sm">{z.description}</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={z.status} />
        <Can perm="zones.edit"><Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Edit</Button></Can>
        <Can perm="zones.deactivate">{z.status === 'Active' ? <><Button size="sm" variant="outline" onClick={() => setConf('Inactive')}><Ban className="h-4 w-4" />Deactivate</Button><Button size="sm" variant="outline" onClick={() => setConf('Archived')}><Archive className="h-4 w-4" />Archive</Button></> : <Can perm="zones.edit"><Button size="sm" variant="secondary" onClick={() => setConf('Active')}><CheckCircle2 className="h-4 w-4" />Activate</Button></Can>}</Can>
        <Button size="sm" variant="ghost" disabled title={deleteBlockedReason(zoneId)}><Trash2 className="h-4 w-4" />Delete (not available)</Button></div></Card>
    <Notice tone="neutral">{deleteBlockedReason(zoneId)}</Notice>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5"><StatCard icon={Users} label="Students" value={m.students} /><StatCard icon={Building2} label="Institutions" value={m.institutions} tone="text-violet-700 bg-violet-50" /><StatCard icon={Percent} label="Submission rate" value={`${m.submissionRate}%`} hint={`${m.submitted} submitted`} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={Ticket} label="Events" value={m.events} tone="text-amber-700 bg-amber-50" /><StatCard icon={Users} label="Participation" value={`${m.participationRate}%`} hint={`Attendance ${m.attendanceRate}%`} tone="text-sky-700 bg-sky-50" /></div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Card><CardHeader title="Assigned officers" />{d.officers.length === 0 ? <EmptyState title="No officers assigned" text="Assign an officer from Officers → details." /> : <ul className="divide-y divide-lavender-200">{d.officers.map((o) => <li key={o.id} className="flex items-center justify-between gap-2 py-2"><div><Link to={`/officers/${o.id}`} className="font-semibold text-navy hover:underline">{o.name}</Link><p className="text-xs text-ink-mute">{o.designation} · {o.email}</p></div><StatusBadge kind={o.status} /></li>)}</ul>}</Card>
      <Card><CardHeader title="Events by status" />{d.events.length === 0 ? <EmptyState title="No events yet" /> : <div className="h-52" role="img" aria-label="Events by status"><ResponsiveContainer><BarChart data={Object.entries(d.eventsByStatus).map(([k, v]) => ({ name: eventStatuses[k], v }))} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="v" name="Events" fill="#0f8a76" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div>}</Card>
    </div>
    <Card><CardHeader title="Institutions" /><DataTable caption="Zone institutions" rows={d.institutions} columns={[{ key: 'n', label: 'Institution', render: (i) => <Link to={`/institutions/${i.id}`} className="font-semibold text-navy hover:underline">{i.name}</Link> }, { key: 'c', label: 'Code', render: (i) => i.code }, { key: 's', label: 'Students', render: (i) => i.students }, { key: 'r', label: 'Submission', render: (i) => `${i.submissionRate}%` }, { key: 'p', label: 'Participation', render: (i) => `${i.participationRate}%` }, { key: 'st', label: 'Status', render: (i) => <StatusBadge kind={i.status} /> }]}
      renderCard={(i) => <div><Link to={`/institutions/${i.id}`} className="font-bold text-navy">{i.name}</Link><p className="text-xs text-ink-soft">{i.students} students · {i.submissionRate}% submitted</p></div>} empty={<EmptyState title="No institutions in this zone" />} /></Card>
    <Card><CardHeader title="Recent zone activity" />{d.activity.length === 0 ? <p className="text-sm text-ink-soft">No recorded activity.</p> : <ul className="divide-y divide-lavender-200 text-sm">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>

    <Modal open={edit} onOpenChange={setEdit} title="Edit zone" description="Status is changed with the activate / deactivate / archive actions."><ZoneForm initial={z} lockStatus submitLabel="Save changes" onCancel={() => setEdit(false)} onSubmit={async (v) => { await updateZone(aid, zoneId, v); toast.success('Zone updated.'); setEdit(false); }} /></Modal>
    <ConfirmDialog open={!!conf} loading={busy} onCancel={() => setConf(null)} tone={conf === 'Active' ? 'primary' : 'danger'} title={`${labelOf[conf] ?? ''}?`} description={`${z.name} • ${z.region}`} confirmLabel={labelOf[conf]} onConfirm={async () => { const r = await run(() => setZoneStatus(aid, zoneId, conf), `Zone set to ${conf}.`); if (r.ok) setConf(null); }}>
      {conf !== 'Active' && <div className="space-y-2 text-sm"><p>This affects <b>{impact.institutions}</b> institution(s), <b>{impact.students}</b> student(s) and <b>{impact.officers}</b> officer(s). Nothing is deleted and records stay visible to authorized admins; the zone just stops being active.</p>{impact.liveEvents > 0 && <p className="rounded-xl bg-amber-50 p-2 text-amber-900">{impact.liveEvents} live event(s) exist{conf === 'Archived' ? ' – archiving will be refused until they are completed or cancelled.' : '.'}</p>}</div>}</ConfirmDialog>
  </div>);
}

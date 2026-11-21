import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowRight, Ban, CheckCircle2, Pencil, Repeat } from 'lucide-react';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, Modal, Notice, StatusBadge } from '../components/ui';
import { Back, KV, NotFoundCard } from '../components/layout/common';
import { Can } from '../components/layout/Gate';
import OfficerForm from '../components/officers/OfficerForm';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { getOfficerDetail, reassignOfficer, setOfficerStatus, updateOfficer } from '../services/officerService';
import { getState } from '../services/store';
import { zoneName } from '../services/metrics';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant } from '../utils/dates';

import { toast } from 'sonner';

export default function OfficerDetails() {
  const { officerId } = useParams(); const { aid } = useAuth(); useStore(); const [edit, setEdit] = useState(false); const [re, setRe] = useState(false); const [newZone, setNewZone] = useState(''); const [conf, setConf] = useState(null); const [run, busy] = useAction();
  const d = getOfficerDetail(aid, officerId); usePageTitle(d?.officer.name ?? 'Officer');
  if (!d) return <NotFoundCard what="Officer" to="/officers" />;
  const o = d.officer; const zones = getState().zones.filter((z) => z.status === 'Active' && z.id !== o.zoneId);
  return (<div className="space-y-4">
    <Back to="/officers">Officers</Back>
    <Card className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{o.name}</h1><p className="text-sm text-ink-soft">{o.officerId} · {o.designation}</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={o.status} />
        <Can perm="officers.edit"><Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Edit</Button></Can>
        <Can perm="officers.reassign"><Button size="sm" variant="outline" onClick={() => { setNewZone(''); setRe(true); }}><Repeat className="h-4 w-4" />{o.zoneId ? 'Reassign zone' : 'Assign zone'}</Button></Can>
        <Can perm="officers.toggle">{o.status === 'Active' ? <Button size="sm" variant="outline" onClick={() => setConf('Inactive')}><Ban className="h-4 w-4" />Deactivate</Button> : <Button size="sm" variant="secondary" onClick={() => setConf('Active')}><CheckCircle2 className="h-4 w-4" />Activate</Button>}</Can></div></Card>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card className="lg:col-span-2"><CardHeader title="Profile" /><KV items={[['Email', o.email], ['Phone', o.phone], ['Designation', o.designation], ['Assigned zone', o.zoneId ? <Link className="text-brand-700 underline" to={`/zones/${o.zoneId}`}>{o.zoneLabel}</Link> : 'Unassigned'], ['Last login', o.lastLogin ? fmtInstant(o.lastLogin) : 'Never'], ['Created', fmtInstant(o.createdAt)]]} />
        {!o.zoneId && <Notice tone="warn" className="mt-3">This officer has no zone yet and cannot manage any records.</Notice>}</Card>
      <Card><CardHeader title="Zone summary" />{d.summary ? <dl className="space-y-2 text-sm">{[['Students', d.summary.students], ['Institutions', d.summary.institutions], ['Submission rate', `${d.summary.submissionRate}%`], ['Events', d.summary.events]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-soft">{k}</dt><dd className="font-extrabold text-navy">{v}</dd></div>)}</dl> : <p className="text-sm text-ink-soft">Assign a zone to see its summary.</p>}</Card>
    </div>
    <Card><CardHeader title="Institutions in assigned zone" />{d.institutions.length === 0 ? <EmptyState title="No institutions" /> : <ul className="grid gap-2 sm:grid-cols-2">{d.institutions.map((i) => <li key={i.id} className="flex items-center justify-between gap-2 rounded-xl border border-lavender-200 p-3 text-sm"><Link to={`/institutions/${i.id}`} className="font-semibold text-navy hover:underline">{i.name}</Link><StatusBadge kind={i.status} /></li>)}</ul>}</Card>
    <Card><CardHeader title="Events managed" /><DataTable caption="Events managed" rows={d.events} columns={[{ key: 't', label: 'Event', render: (e) => <Link to={`/events/${e.id}`} className="font-semibold text-navy hover:underline">{e.title}</Link> }, { key: 'c', label: 'Category', render: (e) => eventCategories[e.category] }, { key: 'd', label: 'Date', render: (e) => fmtDate(e.date) }, { key: 's', label: 'Status', render: (e) => <StatusBadge kind={e.status} /> }, { key: 'a', label: 'Accepted / invited', render: (e) => `${e.stats.accepted} / ${e.stats.invited}` }]}
      renderCard={(e) => <div><Link to={`/events/${e.id}`} className="font-bold text-navy">{e.title}</Link><p className="text-xs text-ink-soft">{fmtDate(e.date)}</p><StatusBadge kind={e.status} /></div>} empty={<EmptyState title="No events managed" />} /></Card>
    <Card><CardHeader title="Activity history" />{d.activity.length === 0 ? <p className="text-sm text-ink-soft">No recorded activity.</p> : <ul className="divide-y divide-lavender-200 text-sm">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>

    <Modal open={edit} onOpenChange={setEdit} title="Edit officer" description="Zone changes use the reassignment workflow."><OfficerForm editing initial={{ name: o.name, email: o.email, phone: o.phone, officerId: o.officerId, designation: o.designation }} submitLabel="Save changes" onCancel={() => setEdit(false)} onSubmit={async (v) => { await updateOfficer(aid, officerId, v); toast.success('Officer updated.'); setEdit(false); }} /></Modal>
    <ConfirmDialog open={re} loading={busy} onCancel={() => setRe(false)} confirmLabel="Confirm reassignment" title={o.zoneId ? 'Reassign officer zone' : 'Assign officer zone'} description={`Officers cannot change their own zone; this needs the officers.reassign permission.`} onConfirm={async () => { if (!newZone) { toast.error('Choose the new zone first.'); return; } const r = await run(() => reassignOfficer(aid, officerId, newZone), 'Officer reassigned and recorded in the audit log.'); if (r.ok) setRe(false); }}>
      <div className="space-y-3 text-sm"><div className="flex items-center gap-2 rounded-xl bg-lavender-50 p-3"><span><b>Current:</b> {o.zoneId ? o.zoneLabel : 'Unassigned'}</span><ArrowRight className="h-4 w-4" /><span><b>New:</b> {newZone ? zoneName(newZone) : '—'}</span></div>
        <label htmlFor="nz" className="label">New zone</label><select id="nz" className="field" value={newZone} onChange={(e) => setNewZone(e.target.value)}><option value="">Select zone…</option>{zones.map((z) => <option key={z.id} value={z.id}>{z.name} • {z.region}</option>)}</select>
        <p className="rounded-xl bg-amber-50 p-3 text-amber-900">Effect: after reassignment the officer will see only the new zone’s students, institutions, events and reports in the Officer Portal. Access to the previous zone ends immediately. Events already created stay with their zone.</p></div></ConfirmDialog>
    <ConfirmDialog open={!!conf} loading={busy} onCancel={() => setConf(null)} tone={conf === 'Inactive' ? 'danger' : 'primary'} title={`${conf === 'Inactive' ? 'Deactivate' : 'Activate'} officer?`} description={o.name} confirmLabel={conf === 'Inactive' ? 'Deactivate' : 'Activate'} onConfirm={async () => { const r = await run(() => setOfficerStatus(aid, officerId, conf), `Officer set to ${conf}.`); if (r.ok) setConf(null); }}>
      <p className="text-sm text-ink-soft">{conf === 'Inactive' ? 'The officer will no longer be able to sign in to the Officer Portal. Their records and history are kept.' : 'The officer will be able to sign in again.'}</p></ConfirmDialog>
  </div>);
}

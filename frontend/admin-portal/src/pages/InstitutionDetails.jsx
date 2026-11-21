import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Ban, Building2, CheckCircle2, Pencil, Percent, UserCheck, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, ConfirmDialog, DataTable, EmptyState, LinkButton, Modal, Notice, StatCard, StatusBadge } from '../components/ui';
import { Back, KV, NotFoundCard } from '../components/layout/common';
import { Can } from '../components/layout/Gate';
import InstitutionForm from '../components/institutions/InstitutionForm';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { deleteBlockedReason, getInstitutionDetail, setInstitutionStatus, updateInstitution } from '../services/institutionService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtShort } from '../utils/dates';

export default function InstitutionDetails() {
  const { institutionId: id } = useParams(); const { aid } = useAuth(); useStore(); const [edit, setEdit] = useState(false); const [conf, setConf] = useState(null); const [run, busy] = useAction();
  const d = getInstitutionDetail(aid, id); usePageTitle(d?.institution.name ?? 'Institution');
  if (!d) return <NotFoundCard what="Institution" to="/institutions" />;
  const i = d.institution;
  return (<div className="space-y-4">
    <Back to="/institutions">Institutions</Back>
    <Card className="flex flex-wrap items-start justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{i.name}</h1><p className="text-sm text-ink-soft">{i.code} · {i.location} · {i.type}</p></div>
      <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={i.status} /><LinkButton to={`/students?institution=${i.id}`} size="sm" variant="outline"><Users className="h-4 w-4" />Students</LinkButton>
        <Can perm="institutions.edit"><Button size="sm" variant="outline" onClick={() => setEdit(true)}><Pencil className="h-4 w-4" />Edit</Button></Can>
        <Can perm="institutions.deactivate">{i.status !== 'Inactive' ? <Button size="sm" variant="outline" onClick={() => setConf('Inactive')}><Ban className="h-4 w-4" />Deactivate</Button> : <Can perm="institutions.edit"><Button size="sm" variant="secondary" onClick={() => setConf('Active')}><CheckCircle2 className="h-4 w-4" />Activate</Button></Can>}</Can></div></Card>
    <Notice tone="neutral">{deleteBlockedReason(id)}</Notice>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><StatCard icon={Users} label="Students" value={d.studentCount} /><StatCard icon={Percent} label="Submission (this week)" value={`${i.submissionRate}%`} tone="text-emerald-700 bg-emerald-50" /><StatCard icon={UserCheck} label="Accepted / invited" value={`${i.accepted}/${i.invited}`} hint={`${i.participationRate}% participation`} tone="text-violet-700 bg-violet-50" /><StatCard icon={Building2} label="Attendance" value={`${i.attendanceRate}%`} hint="Present ÷ accepted" tone="text-sky-700 bg-sky-50" /></div>
    <div className="grid gap-4 lg:grid-cols-3">
      <Card><CardHeader title="Institution profile" /><KV cols="" items={[['Zone', i.zoneId ? <Link className="text-brand-700 underline" to={`/zones/${i.zoneId}`}>{i.zoneLabel}</Link> : 'Unassigned'], ['Contact person', i.contactName], ['Contact email', i.contactEmail], ['Contact phone', i.contactPhone], ['Departments', i.departments.join(', ')], ['Created', fmtInstant(i.createdAt)]]} /></Card>
      <Card><CardHeader title="Academic years" /><div className="h-48" role="img" aria-label="Students per academic year"><ResponsiveContainer><BarChart data={d.years} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Students" fill="#1f3763" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
      <Card><CardHeader title="Weekly submission" /><div className="h-48" role="img" aria-label="Weekly availability submission rate"><ResponsiveContainer><LineChart data={d.weekly.map((w) => ({ ...w, label: fmtShort(w.weekStart) }))} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={11} /><YAxis domain={[0, 100]} unit="%" fontSize={11} /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="submissionRate" name="Submission" stroke="#0f8a76" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Card>
    </div>
    <Card><CardHeader title="Event participation" /><DataTable caption="Event participation" rows={d.events} rowKey={(r) => r.event.id} columns={[{ key: 'e', label: 'Event', render: (r) => <Link to={`/events/${r.event.id}`} className="font-semibold text-navy hover:underline">{r.event.title}</Link> }, { key: 'c', label: 'Category', render: (r) => eventCategories[r.event.category] }, { key: 'd', label: 'Date', render: (r) => fmtDate(r.event.date) }, { key: 's', label: 'Status', render: (r) => <StatusBadge kind={r.event.status} /> }, { key: 'i', label: 'Invited', render: (r) => r.invited }, { key: 'a', label: 'Accepted', render: (r) => r.accepted }, { key: 'p', label: 'Present', render: (r) => r.present }]}
      renderCard={(r) => <div><Link to={`/events/${r.event.id}`} className="font-bold text-navy">{r.event.title}</Link><p className="text-xs text-ink-soft">{fmtDate(r.event.date)} · {r.invited} invited · {r.accepted} accepted · {r.present} present</p></div>} empty={<EmptyState title="No events target this institution" />} /></Card>
    <Card><CardHeader title="Institution activity history" />{d.activity.length === 0 ? <p className="text-sm text-ink-soft">No recorded activity.</p> : <ul className="divide-y divide-lavender-200 text-sm">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap justify-between gap-2 py-2"><span><b className="text-navy">{a.description}</b> · {a.actorName}</span><span className="text-xs text-ink-mute">{fmtInstant(a.at)}</span></li>)}</ul>}</Card>
    <Modal open={edit} onOpenChange={setEdit} size="lg" title="Edit institution" description="All changes are recorded in the audit log."><InstitutionForm id={id} initial={{ ...i, departmentsText: i.departments.join(', '), zoneId: i.zoneId ?? '' }} submitLabel="Save changes" onCancel={() => setEdit(false)} onSubmit={async (v) => { await updateInstitution(aid, id, v); toast.success('Institution updated.'); setEdit(false); }} /></Modal>
    <ConfirmDialog open={!!conf} loading={busy} onCancel={() => setConf(null)} tone={conf === 'Inactive' ? 'danger' : 'primary'} title={`${conf === 'Inactive' ? 'Deactivate' : 'Activate'} institution?`} description={i.name} confirmLabel={conf === 'Inactive' ? 'Deactivate' : 'Activate'} onConfirm={async () => { const r = await run(() => setInstitutionStatus(aid, id, conf), `Institution set to ${conf}.`); if (r.ok) setConf(null); }}><p className="text-sm text-ink-soft">{conf === 'Inactive' ? `Its ${d.studentCount} student(s) and history are kept; the institution just stops being active.` : 'The institution becomes active again.'}</p></ConfirmDialog>
  </div>);
}

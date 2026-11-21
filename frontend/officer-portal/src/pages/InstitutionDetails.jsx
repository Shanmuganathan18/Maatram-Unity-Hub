import { Link, useParams } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Card, CardHeader, DataTable, EmptyState, LinkButton, StatCard, StatusBadge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { getInstitutionDetail } from '../services/institutionService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtShort } from '../utils/dates';
import { Building2, Users, Percent, UserCheck } from 'lucide-react';

export default function InstitutionDetails() {
  const { institutionId } = useParams(); const { oid } = useAuth(); useStore();
  const d = getInstitutionDetail(oid, institutionId);
  usePageTitle(d?.institution.name ?? 'Institution');
  if (!d) return <EmptyState icon={SearchX} title="Institution not found" text="This institution doesn’t exist or isn’t in your zone." action={<LinkButton to="/institutions" variant="secondary">Back to institutions</LinkButton>} />;
  const i = d.institution;
  return (
    <div className="space-y-4">
      <Link to="/institutions" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />All institutions</Link>
      <Card className="flex flex-wrap items-center justify-between gap-3"><div><h1 className="text-2xl font-extrabold">{i.name}</h1><p className="text-sm text-ink-soft">{i.code} · {i.location}</p></div><div className="flex gap-2"><StatusBadge kind={i.status} /><LinkButton to={`/students?institution=${i.id}`} variant="outline" size="sm">View students</LinkButton></div></Card>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Students" value={d.totalStudents} /><StatCard icon={Percent} label="Submission rate (this week)" value={`${d.submissionRate}%`} tone="text-emerald-700 bg-emerald-50" />
        <StatCard icon={UserCheck} label="Accepted invitations" value={`${d.accepted}/${d.invited}`} hint={`${d.participationRate}% participation`} tone="text-violet-700 bg-violet-50" /><StatCard icon={Building2} label="Attendance rate" value={`${d.attendanceRate}%`} hint="Present ÷ accepted" tone="text-sky-700 bg-sky-50" />
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card><CardHeader title="Department breakdown" /><div className="h-56" role="img" aria-label="Students per department"><ResponsiveContainer><BarChart data={d.departments} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Students" fill="#0f8a76" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Year-wise students" /><div className="h-56" role="img" aria-label="Students per academic year"><ResponsiveContainer><BarChart data={d.years} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} /><YAxis allowDecimals={false} fontSize={11} /><Tooltip /><Bar dataKey="value" name="Students" fill="#1f3763" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader title="Weekly submission trend" /><div className="h-56" role="img" aria-label="Weekly availability submission rate"><ResponsiveContainer><LineChart data={d.weekly.map((w) => ({ ...w, label: fmtShort(w.weekStart) }))} margin={{ left: -20 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={11} /><YAxis domain={[0, 100]} unit="%" fontSize={11} /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="submissionRate" name="Submission rate" stroke="#0f8a76" strokeWidth={2} /></LineChart></ResponsiveContainer></div></Card>
      </div>
      <Card><CardHeader title="Event history & participation" />
        <DataTable caption="Event history" rows={d.events} rowKey={(r) => r.event.id}
          columns={[{ key: 'e', label: 'Event', render: (r) => <Link className="font-semibold text-navy hover:underline" to={`/events/${r.event.id}`}>{r.event.title}</Link> }, { key: 'c', label: 'Category', render: (r) => eventCategories[r.event.category] }, { key: 'd', label: 'Date', render: (r) => fmtDate(r.event.date) }, { key: 's', label: 'Status', render: (r) => <StatusBadge kind={r.event.status} /> }, { key: 'i', label: 'Invited', render: (r) => r.invited }, { key: 'a', label: 'Accepted', render: (r) => r.accepted }, { key: 'p', label: 'Present', render: (r) => r.attended }]}
          renderCard={(r) => <div><Link className="font-bold text-navy" to={`/events/${r.event.id}`}>{r.event.title}</Link><p className="text-xs text-ink-soft">{fmtDate(r.event.date)}</p><p className="text-sm">{r.invited} invited · {r.accepted} accepted · {r.attended} present</p></div>} empty={<EmptyState title="No events target this institution yet" />} /></Card>
    </div>
  );
}

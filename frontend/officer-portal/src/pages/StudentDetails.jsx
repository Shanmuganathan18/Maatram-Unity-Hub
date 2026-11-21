import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, SearchX } from 'lucide-react';
import { Card, CardHeader, DataTable, EmptyState, LinkButton, Notice, PendingTag, StatusBadge, Avatar } from '../components/ui';
import { AvailabilityCell } from '../components/availability/AvailabilityCell';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { getStudentDetail } from '../services/studentService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtInstant, fmtRange, fmtWeekday } from '../utils/dates';

export default function StudentDetails() {
  const { studentId } = useParams(); const { oid } = useAuth(); useStore();
  const d = getStudentDetail(oid, studentId);
  usePageTitle(d?.student.name ?? 'Student');
  if (!d) return <EmptyState icon={SearchX} title="Student not found" text="This student doesn’t exist or isn’t in your zone." action={<LinkButton to="/students" variant="secondary">Back to students</LinkButton>} />;
  const { student: s, weeks, invitations, participation: p } = d;
  const fields = [['Student ID', s.studentId], ['Institution', s.institution], ['Department', s.department], ['Year', `Year ${s.year}`], ['Email', s.email], ['Phone', s.phone], ['Groups', s.groups.join(', ') || '—']];
  return (
    <div className="space-y-4">
      <Link to="/students" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />All students</Link>
      <Card className="flex flex-col gap-4 sm:flex-row sm:items-center"><Avatar student={s} size="h-16 w-16 text-xl" /><div className="flex-1"><h1 className="text-2xl font-extrabold">{s.name}</h1><p className="text-sm text-ink-soft">{s.studentId} · {s.institution}</p></div><StatusBadge kind={p.label} /></Card>
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2"><CardHeader title="Personal & institution details" /><dl className="grid gap-3 text-sm sm:grid-cols-2">{fields.map(([k, v]) => <div key={k}><dt className="text-xs font-semibold uppercase text-ink-mute">{k}</dt><dd className="font-medium text-navy">{v}</dd></div>)}</dl><Notice tone="neutral" className="mt-4">Editing student records is <PendingTag /> (view-only).</Notice></Card>
        <Card><CardHeader title="Participation summary" /><dl className="space-y-2 text-sm">{[['Invitations', p.invited], ['Accepted', p.accepted], ['Attended (present)', p.attended]].map(([k, v]) => <div key={k} className="flex justify-between"><dt className="text-ink-soft">{k}</dt><dd className="text-lg font-extrabold text-navy">{v}</dd></div>)}</dl></Card>
      </div>

      <Card><CardHeader title="Weekly availability history" />
        <DataTable caption="Weekly availability history" rows={weeks} rowKey={(w) => w.weekStart}
          columns={[{ key: 'w', label: 'Week', render: (w) => fmtRange(w.weekStart) }, { key: 'st', label: 'Status', render: (w) => <span className="flex gap-1"><StatusBadge kind={w.status} />{w.locked && <StatusBadge kind="locked" />}</span> },
            { key: 'days', label: 'Mon → Sun', render: (w) => <div className="grid w-[260px] grid-cols-7 gap-1">{w.days.map((x) => <AvailabilityCell key={x.date} state={x.state} />)}</div> }, { key: 'a', label: 'Available', render: (w) => w.available }, { key: 'u', label: 'Unavailable', render: (w) => w.unavailable }, { key: 'sub', label: 'Submitted', render: (w) => (w.submittedAt ? fmtInstant(w.submittedAt) : '—') }]}
          renderCard={(w) => <div><p className="font-bold text-navy">{fmtRange(w.weekStart)}</p><div className="my-2 grid grid-cols-7 gap-1">{w.days.map((x) => <div key={x.date}><p className="text-center text-[10px] text-ink-mute">{fmtWeekday(x.date)[0]}</p><AvailabilityCell state={x.state} /></div>)}</div><StatusBadge kind={w.status} /></div>} />
        <p className="mt-2 text-xs text-ink-mute">Officers monitor availability; they cannot edit a student’s availability (<PendingTag />).</p></Card>

      <Card><CardHeader title="Event invitations, responses & attendance" />
        <DataTable caption="Event history" rows={invitations}
          columns={[{ key: 'e', label: 'Event', render: (i) => <Link className="font-semibold text-navy hover:underline" to={`/events/${i.event.id}`}>{i.event.title}</Link> }, { key: 'c', label: 'Category', render: (i) => eventCategories[i.event.category] }, { key: 'd', label: 'Date', render: (i) => fmtDate(i.event.date) },
            { key: 'r', label: 'Response', render: (i) => <StatusBadge kind={i.response} /> }, { key: 'rd', label: 'Responded', render: (i) => (i.respondedAt ? fmtInstant(i.respondedAt) : '—') }, { key: 'a', label: 'Attendance', render: (i) => <StatusBadge kind={i.attendance ?? 'not_marked'} /> }]}
          renderCard={(i) => <div><Link className="font-bold text-navy" to={`/events/${i.event.id}`}>{i.event.title}</Link><p className="text-xs text-ink-soft">{fmtDate(i.event.date)}</p><div className="mt-2 flex gap-2"><StatusBadge kind={i.response} /><StatusBadge kind={i.attendance ?? 'not_marked'} /></div></div>}
          empty={<EmptyState title="Not invited to any event yet" />} />
        <p className="mt-2 text-xs text-ink-mute">Availability, response and attendance are three separate records.</p></Card>
    </div>
  );
}

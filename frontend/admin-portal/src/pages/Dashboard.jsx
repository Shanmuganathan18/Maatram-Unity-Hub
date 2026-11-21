import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Building2, CalendarCheck, CalendarClock, LifeBuoy, Map, Percent, ScrollText, Ticket, UserCog, Users, UsersRound, Activity } from 'lucide-react';
import { Card, CardHeader, FilterBar, Notice, PageHeader, SelectField, StatCard, TextLink, Badge } from '../components/ui';
import AlertList from '../components/dashboard/AlertList';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { getDashboard } from '../services/dashboardService';
import { studentFilterOptions } from '../services/studentService';
import { eventCategories, eventStatuses } from '../config/appConfig';
import { fmtInstant, fmtRange, fmtShort, fmtWeekday, fmtDayNum, isoWeekNumber } from '../utils/dates';

const C = { a: '#10b981', u: '#f43f5e', n: '#94a3b8', teal: '#0f8a76', navy: '#1f3763', amber: '#f59e0b' };
const D = { from: '', to: '', zoneId: '', institutionId: '', category: '', year: '' };
export default function Dashboard() {
  usePageTitle('Dashboard'); const { aid, admin } = useAuth(); useStore(); const [f, setF] = useState(D); const set = (p) => setF((x) => ({ ...x, ...p }));
  const d = getDashboard(aid, f); const c = d.cards; const o = studentFilterOptions(); const ws = d.weekStart;
  const insts = o.institutions.filter((i) => !f.zoneId || i.zoneId === f.zoneId);
  return (
    <div className="space-y-5">
      <PageHeader title={`Welcome, ${admin.name.split(' ')[0]}`} subtitle={`${admin.roleLabel} · system-wide view · Week ${isoWeekNumber(ws)} (${fmtRange(ws)}). Charts and cards follow the filters below.`} />
      <FilterBar onClear={() => setF(D)} active={JSON.stringify(f) !== JSON.stringify(D)}>
        <div><label htmlFor="df" className="label">Events from</label><input id="df" type="date" className="field" value={f.from} onChange={(e) => set({ from: e.target.value })} /></div>
        <div><label htmlFor="dt" className="label">Events to</label><input id="dt" type="date" className="field" value={f.to} onChange={(e) => set({ to: e.target.value })} /></div>
        <SelectField id="dz" label="Zone" value={f.zoneId} onChange={(v) => set({ zoneId: v, institutionId: '' })} options={o.zones} />
        <SelectField id="di" label="Institution" value={f.institutionId} onChange={(v) => set({ institutionId: v })} options={insts} />
        <SelectField id="dc" label="Event category" value={f.category} onChange={(v) => set({ category: v })} options={Object.entries(eventCategories).map(([value, label]) => ({ value, label }))} />
        <SelectField id="dy" label="Academic year" value={f.year} onChange={(v) => set({ year: v })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
      </FilterBar>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={Map} label="Total zones" value={c.zones} to="/zones" /><StatCard icon={Map} label="Active zones" value={c.activeZones} to="/zones?status=Active" tone="text-emerald-700 bg-emerald-50" />
        <StatCard icon={UserCog} label="Officers" value={c.officers} to="/officers" tone="text-sky-700 bg-sky-50" /><StatCard icon={Building2} label="Institutions" value={c.institutions} to="/institutions" tone="text-violet-700 bg-violet-50" />
        <StatCard icon={Users} label="Students" value={c.students} to="/students" tone="text-brand-700 bg-brand-50" />
        <StatCard icon={Percent} label="Availability submission" value={`${c.submissionRate}%`} hint={`${c.submitted} of ${c.students} students`} to="/availability" tone="text-emerald-700 bg-emerald-50" />
        <StatCard icon={Ticket} label="Total events" value={c.events} to="/events" tone="text-navy bg-lavender-100" /><StatCard icon={CalendarClock} label="Upcoming events" value={c.upcoming} to="/events" tone="text-amber-700 bg-amber-50" />
        <StatCard icon={UsersRound} label="Event participation" value={c.participation} hint="Accepted responses" to="/reports" tone="text-teal-700 bg-brand-50" /><StatCard icon={LifeBuoy} label="Pending support tickets" value={c.pendingTickets} to="/support" tone="text-rose-700 bg-rose-50" />
      </div>

      <Card><CardHeader icon={Map} title="Zone-wise performance" action={<TextLink to="/reports">Zone report</TextLink>} />
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="h-72" role="img" aria-label="Bar chart comparing zones on submission, participation and attendance rates"><ResponsiveContainer><BarChart data={d.zoneCompare} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip /><Legend /><Bar dataKey="submissionRate" name="Submission %" fill={C.teal} /><Bar dataKey="participationRate" name="Participation %" fill={C.navy} /><Bar dataKey="attendanceRate" name="Attendance %" fill={C.amber} /></BarChart></ResponsiveContainer></div>
          <div className="overflow-x-auto"><table className="w-full text-sm"><caption className="sr-only">Zone comparison</caption><thead className="bg-lavender-100 text-xs uppercase text-ink-soft"><tr>{['Zone', 'Students', 'Submitted', 'Rate', 'Participation'].map((h) => <th key={h} scope="col" className="px-3 py-2 text-left">{h}</th>)}</tr></thead><tbody className="divide-y divide-lavender-200">{d.zoneCompare.map((z) => <tr key={z.id}><td className="px-3 py-2 font-semibold"><Link className="text-navy hover:underline" to={`/zones/${z.id}`}>{z.name}</Link></td><td className="px-3 py-2">{z.students}</td><td className="px-3 py-2">{z.submitted}</td><td className="px-3 py-2">{z.submissionRate}%</td><td className="px-3 py-2">{z.participation} ({z.participationRate}%)</td></tr>)}</tbody></table>
            <p className="mt-2 text-xs text-ink-mute">Submission % = submitted ÷ all students of the zone. Participation % = accepted ÷ invited. Attendance % = present ÷ accepted.</p></div></div></Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader icon={CalendarCheck} title="Weekly availability" action={<TextLink to="/availability">Monitoring</TextLink>} />
          <div className="h-64" role="img" aria-label="Stacked bar chart of available, unavailable and not submitted students per day"><ResponsiveContainer><BarChart data={d.perDay} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="date" tickFormatter={(v) => `${fmtWeekday(v)} ${fmtDayNum(v)}`} fontSize={11} /><YAxis fontSize={12} allowDecimals={false} /><Tooltip /><Legend /><Bar dataKey="available" name="Available" stackId="a" fill={C.a} /><Bar dataKey="unavailable" name="Unavailable" stackId="a" fill={C.u} /><Bar dataKey="notSubmitted" name="Not submitted / no valid answer" stackId="a" fill={C.n} /></BarChart></ResponsiveContainer></div></Card>
        <Card><CardHeader icon={Activity} title="Submission trend" />
          <div className="h-64" role="img" aria-label="Weekly submission rate trend"><ResponsiveContainer><LineChart data={d.trend.map((t) => ({ ...t, label: fmtShort(t.weekStart) }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="submissionRate" name="Submission rate" stroke={C.teal} strokeWidth={2} /></LineChart></ResponsiveContainer></div><p className="mt-1 text-xs text-ink-mute">Future weeks are still open, so their rate can rise before the deadline.</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader icon={Building2} title="Institution analytics" action={<TextLink to="/institutions">All institutions</TextLink>} />
          <div className="h-64" role="img" aria-label="Student count and submission rate by institution"><ResponsiveContainer><BarChart data={d.institutionAnalytics} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis fontSize={12} /><Tooltip labelFormatter={(l, p) => p?.[0]?.payload.full ?? l} /><Legend /><Bar dataKey="students" name="Students" fill={C.navy} /><Bar dataKey="submissionRate" name="Submission %" fill={C.teal} /><Bar dataKey="participationRate" name="Participation %" fill={C.amber} /></BarChart></ResponsiveContainer></div>
          <p className="mt-2 text-xs text-ink-soft">Institutions per zone: {d.instByZone.map((z) => `${z.name} ${z.institutions}`).join(' · ')}</p></Card>
        <Card><CardHeader icon={Ticket} title="Event analytics" action={<TextLink to="/events">All events</TextLink>} />
          <div className="mb-3 grid grid-cols-2 gap-2 sm:grid-cols-4">{[['Total', d.eventAnalytics.total], ['Upcoming', c.upcoming], ['Completed', d.eventAnalytics.statusCount.completed], ['Cancelled', d.eventAnalytics.statusCount.cancelled]].map(([k, v]) => <div key={k} className="rounded-xl bg-lavender-50 p-3 text-center"><p className="text-xl font-extrabold text-navy">{v}</p><p className="text-xs text-ink-soft">{k}</p></div>)}</div>
          <div className="h-44" role="img" aria-label="Events by status"><ResponsiveContainer><BarChart data={Object.entries(d.eventAnalytics.statusCount).map(([k, v]) => ({ name: eventStatuses[k], v }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={10} /><YAxis allowDecimals={false} fontSize={12} /><Tooltip /><Bar dataKey="v" name="Events" fill={C.navy} /></BarChart></ResponsiveContainer></div>
          <p className="mt-2 text-sm">Response rate <b>{d.eventAnalytics.responseRate}%</b> (responded ÷ invited) · Attendance rate <b>{d.eventAnalytics.attendanceRate}%</b> (present ÷ accepted)</p></Card>
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card><CardHeader icon={Activity} title="Attention required" action={<Badge className="border-amber-300 bg-amber-50 text-amber-800">Computed from mock data</Badge>} /><AlertList alerts={d.alerts} /></Card>
        <Card><CardHeader icon={ScrollText} title="Recent system activity" action={<TextLink to="/activity-logs">Audit log</TextLink>} />
          <ul className="divide-y divide-lavender-200">{d.activity.map((a) => <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm"><span><b className="text-navy">{a.description}</b>{a.related && <span className="text-ink-soft"> · {a.related.label}</span>}</span><span className="text-xs text-ink-mute">{a.actorName} · {fmtInstant(a.at)}</span></li>)}</ul></Card>
      </div>
      <Notice tone="neutral">Alerts and thresholds (e.g. submission &lt; 60%, 3-day ticket SLA) are prototype assumptions; no real system-health data is shown.</Notice>
    </div>
  );
}

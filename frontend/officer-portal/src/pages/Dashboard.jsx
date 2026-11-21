import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { BarChart3, CalendarCheck, CalendarDays, CalendarPlus, Building2, Hourglass, Percent, Ticket, UserCheck, UserX, Users, Users2, ScrollText } from 'lucide-react';
import { Card, CardHeader, EmptyState, LinkButton, StatCard, StatusBadge, TextLink } from '../components/ui';
import { PctCell } from '../components/availability/AvailabilityCell';
import { useAuth } from '../hooks/useAuth';
import { useStore, usePageTitle } from '../hooks/useStore';
import { getDashboard } from '../services/dashboardService';
import { eventCategories } from '../config/appConfig';
import { fmtDate, fmtRange, fmtTimeRange, fmtInstant, fmtWeekday, fmtDayNum, isoWeekNumber } from '../utils/dates';

const C = { available: '#10b981', unavailable: '#f43f5e', notSubmitted: '#94a3b8', accepted: '#0f8a76', attended: '#1f3763' };

export default function Dashboard() {
  usePageTitle('Dashboard');
  const { oid, officer } = useAuth(); useStore();
  const d = getDashboard(oid); const c = d.cards;
  const ws = d.weekStart;
  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold sm:text-3xl">
            Welcome, {officer?.name ? officer.name.split(' ')[0] : 'Officer'}
          </h1>
          <p className="text-sm text-ink-soft">
            {officer?.zoneLabel || 'Assigned Zone'} · Week {isoWeekNumber(ws)} ({fmtRange(ws)}). Showing only your zone’s data.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <LinkButton to="/events/create"><CalendarPlus className="h-4 w-4" />Create Event</LinkButton>
          <LinkButton to="/students" variant="outline"><Users className="h-4 w-4" />View Students</LinkButton>
          <LinkButton to={`/availability/${ws}`} variant="outline"><CalendarCheck className="h-4 w-4" />View Availability</LinkButton>
          <LinkButton to="/calendar" variant="outline"><CalendarDays className="h-4 w-4" />Open Calendar</LinkButton>
          <LinkButton to="/reports" variant="outline"><BarChart3 className="h-4 w-4" />Generate Report</LinkButton>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users} label="Total students" value={c.students} to="/students" hint="In your zone" />
        <StatCard icon={Building2} label="Total institutions" value={c.institutions} to="/institutions" hint="In your zone" tone="text-sky-700 bg-sky-50" />
        <StatCard icon={UserCheck} label="Availability submitted" value={c.submitted} to="/students?availability=submitted" hint={`${c.submissionRate}% of students this week`} tone="text-emerald-700 bg-emerald-50" />
        <StatCard icon={UserX} label="Availability not submitted" value={c.notSubmitted} to="/students?availability=not_submitted" hint="Includes drafts" tone="text-rose-700 bg-rose-50" />
        <StatCard icon={Ticket} label="Upcoming events" value={c.upcoming} to="/events" tone="text-violet-700 bg-violet-50" />
        <StatCard icon={Hourglass} label="Pending event responses" value={c.pendingResponses} to="/events" hint="Across live events" tone="text-amber-700 bg-amber-50" />
        <StatCard icon={Users2} label="Event participation" value={c.participation} to="/reports" hint="Accepted responses" tone="text-brand-700 bg-brand-50" />
        <StatCard icon={Percent} label="Attendance rate" value={`${c.attendanceRate}%`} to="/reports" hint="Present ÷ accepted (live/finished events)" tone="text-navy bg-lavender-100" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon={CalendarCheck} title="Weekly availability overview" action={<TextLink to={`/availability/${ws}`}>Details</TextLink>} />
          <div className="h-72" role="img" aria-label="Stacked bar chart of Available, Unavailable and Not submitted students for each day of the week">
            <ResponsiveContainer><BarChart data={d.perDay} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" tickFormatter={(v, i) => `${fmtWeekday(d.days[i])} ${fmtDayNum(d.days[i])}`} fontSize={12} /><YAxis fontSize={12} allowDecimals={false} /><Tooltip /><Legend />
              <Bar dataKey="available" name="Available" stackId="a" fill={C.available} /><Bar dataKey="unavailable" name="Unavailable" stackId="a" fill={C.unavailable} /><Bar dataKey="notSubmitted" name="Not submitted / no valid answer" stackId="a" fill={C.notSubmitted} /></BarChart></ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <CardHeader icon={Building2} title="Institution-wise submission rate" action={<TextLink to="/availability">Compare</TextLink>} />
          <div className="h-72" role="img" aria-label="Bar chart of availability submission rate per institution">
            <ResponsiveContainer><BarChart data={d.institutionRates} layout="vertical" margin={{ left: 10 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} /><YAxis type="category" dataKey="name" width={110} fontSize={11} /><Tooltip formatter={(v) => `${v}%`} labelFormatter={(l, p) => p?.[0]?.payload.full ?? l} /><Bar dataKey="rate" name="Submission rate" fill={C.accepted} radius={[0, 6, 6, 0]} /></BarChart></ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader icon={CalendarCheck} title="Availability heatmap – % of students available" action={<TextLink to={`/availability/${ws}`}>Student-level heatmap</TextLink>} />
        <div className="overflow-x-auto"><table className="w-full min-w-[560px] text-sm"><caption className="sr-only">Percentage of students available per institution and day</caption>
          <thead><tr><th scope="col" className="py-2 pr-3 text-left text-xs uppercase text-ink-soft">Institution</th>{d.days.map((x) => <th key={x} scope="col" className="px-1 text-center text-xs uppercase text-ink-soft">{fmtWeekday(x)} {fmtDayNum(x)}</th>)}</tr></thead>
          <tbody>{d.heat.map((h) => <tr key={h.institution}><th scope="row" className="py-1 pr-3 text-left font-semibold text-navy">{h.institution}<span className="block text-xs font-normal text-ink-mute">{h.total} students</span></th>{h.cells.map((x) => <td key={x.date} className="p-1"><PctCell pct={x.pct} count={x.available} /></td>)}</tr>)}</tbody></table></div>
        <p className="mt-3 text-xs text-ink-mute">Percent = Available ÷ all students of the institution (students who haven’t submitted count as not available). Darker = more students available.</p>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader icon={Users2} title="Event participation over time" action={<TextLink to="/reports">Reports</TextLink>} />
          {d.participationTrend.length === 0 ? <EmptyState title="No events yet" /> : <div className="h-64" role="img" aria-label="Line chart of accepted and attended students per event date"><ResponsiveContainer><LineChart data={d.participationTrend} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={12} /><YAxis fontSize={12} allowDecimals={false} /><Tooltip labelFormatter={(l, p) => p?.[0]?.payload.title ?? l} /><Legend /><Line type="linear" dataKey="accepted" name="Accepted" stroke={C.accepted} strokeWidth={2} /><Line type="linear" dataKey="attended" name="Attended" stroke={C.attended} strokeWidth={2} /></LineChart></ResponsiveContainer></div>}
        </Card>
        <Card>
          <CardHeader icon={Ticket} title="Upcoming events" action={<TextLink to="/events">All events</TextLink>} />
          {(!d.upcoming || d.upcoming.length === 0) ? (
          <EmptyState icon={Ticket} title="No upcoming events" action={<LinkButton to="/events/create" variant="secondary">Create event</LinkButton>} />
        ) : (
          <ul className="divide-y divide-lavender-200">
            {d.upcoming.map((e) => (
              <li key={e.id} className="flex flex-wrap items-center gap-2 py-3">
                <div className="min-w-0 flex-1">
                  <Link to={`/events/${e.id}`} className="block truncate font-bold text-navy hover:underline">
                    {e.title}
                  </Link>
                  <p className="text-xs text-ink-soft">
                    {eventCategories[e.category] || e.category || 'General'} · {fmtDate(e.date)} · {fmtTimeRange(e.startTime, e.endTime)}
                  </p>
                  <p className="truncate text-xs text-ink-mute">
                    {e.institutionNames?.length ? e.institutionNames.join(', ') : 'All Institutions'}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <StatusBadge kind={e.status} />
                  <span className="text-xs text-ink-soft">
                    {e.stats?.accepted ?? 0} accepted · {e.stats?.pending ?? 0} pending
                  </span>
                </div>
                <LinkButton to={`/events/${e.id}`} size="sm" variant="outline">View details</LinkButton>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>

    <Card>
      <CardHeader icon={ScrollText} title="Recent activities" action={<TextLink to="/activity">Full log</TextLink>} />
      <ul className="divide-y divide-lavender-200">
        {(d.activity || []).map((a) => (
          <li key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-sm">
            <span>
              <b className="text-navy">{a.description}</b>
              {a.related && <> – <Link className="text-brand-700 underline" to={a.related.type === 'event' ? `/events/${a.related.id}` : '/activity'}>{a.related.label}</Link></>}
            </span>
            <span className="text-xs text-ink-mute">{a.actorName} · {fmtInstant(a.at)}</span>
          </li>
        ))}
      </ul>
    </Card>
    </div>
  );
}

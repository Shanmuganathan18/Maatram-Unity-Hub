import { Link } from 'react-router-dom';
import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { CalendarCheck, Info, Lock, Star } from 'lucide-react';
import { Card, CardHeader, FilterBar, LinkButton, Notice, PageHeader, SelectField, StatCard, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { useNow, usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import * as av from '../services/availabilityService';
import { fmtDate, fmtDeadline, fmtRange, fmtShort, isoWeekNumber } from '../utils/dates';
import { cn } from '../utils/cn';
import { Hourglass, UserCheck, ShieldAlert, PencilLine } from 'lucide-react';

const D = { week: '', institution: '', department: '', year: '', by: 'institution' };
export default function Availability() {
  usePageTitle('Availability overview');
  const { oid } = useAuth(); useStore(); const nowMs = useNow(30000);
  const [f, set, clear, active] = useQueryState(D);
  const weeks = av.weekOptions(nowMs); const ws = weeks.includes(f.week) ? f.week : av.defaultWeek(nowMs);
  const filters = { institutionId: f.institution, department: f.department, year: f.year };
  const { rows, info, days } = av.matrix(oid, ws, filters, nowMs); const w = av.weekStats(rows);
  const best = av.bestDates(rows, days); const top = best.slice(0, 3);
  const cmp = av.compare(oid, ws, f.by, filters); const trend = av.trend(oid, filters, nowMs);
  return (
    <>
      <PageHeader title="Availability overview" subtitle="Monitor weekly submissions and find suitable event dates. Officers cannot edit student availability." actions={<LinkButton to={`/availability/${ws}`}><CalendarCheck className="h-4 w-4" />Open week details</LinkButton>} />
      <Tabs label="Select week" value={ws} onChange={(v) => set({ week: v })} tabs={weeks.map((x) => ({ id: x, label: `${fmtShort(x)} (W${isoWeekNumber(x)})` }))} />
      <FilterBar onClear={clear} active={active}>
        <SelectField id="ai" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={av.institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} />
        <SelectField id="ad" label="Department" value={f.department} onChange={(v) => set({ department: v })} options={av.departments(oid)} />
        <SelectField id="ay" label="Year" value={f.year} onChange={(v) => set({ year: v })} options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} />
      </FilterBar>

      <Card className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-bold text-navy">{fmtRange(ws)} · Week {isoWeekNumber(ws)}</p><p className="text-sm text-ink-soft">Deadline: {fmtDeadline(info.deadline)} IST</p></div>
        <div className="flex gap-2"><StatusBadge kind={info.open ? 'open' : 'locked'} />{info.locked && <span className="flex items-center gap-1 text-xs text-ink-soft"><Lock className="h-3 w-3" />Students can no longer change this week</span>}</div>
      </Card>

      <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <StatCard icon={UserCheck} label="Submitted" value={w.submitted} hint={`${w.submissionRate}% of ${w.total}`} tone="text-emerald-700 bg-emerald-50" />
        <StatCard icon={PencilLine} label="Draft (not submitted)" value={w.draft} tone="text-amber-700 bg-amber-50" />
        <StatCard icon={Hourglass} label="Not submitted" value={w.not_submitted} tone="text-slate-700 bg-slate-100" />
        <StatCard icon={ShieldAlert} label="System-assumed unavailable" value={w.system_assumed_unavailable} hint="After deadline, if rule applies" tone="text-orange-700 bg-orange-50" />
        <StatCard icon={CalendarCheck} label="Eligible students" value={w.total} />
      </div>

      <Card className="mb-4">
        <CardHeader icon={Star} title="Best-date recommendation" action={<LinkButton to={`/events/create`} size="sm" variant="secondary">Create event</LinkButton>} />
        <div className="grid gap-3 md:grid-cols-3">{top.map((b, i) => (
          <div key={b.date} className={cn('rounded-2xl border p-4', i === 0 ? 'border-brand-400 bg-brand-50' : 'border-lavender-300')}>
            <p className="text-xs font-bold uppercase text-ink-mute">#{i + 1} suggestion</p><p className="text-lg font-extrabold text-navy">{fmtDate(b.date)}</p>
            <p className="text-3xl font-extrabold text-brand-700">{b.availablePct}%</p><p className="text-xs text-ink-soft">{b.available} of {b.total} eligible students marked Available</p>
            <ul className="mt-2 text-xs text-ink-soft"><li>Unavailable: <b>{b.unavailable}</b></li><li>Not submitted / no valid answer: <b>{b.noValid + b.not_selected}</b></li><li>Available among those who answered: <b>{b.availableOfRespondersPct}%</b></li></ul>
            <Link to={`/availability/${ws}?date=${b.date}`} className="mt-2 inline-block text-sm font-semibold text-brand-700 underline">See students</Link></div>))}</div>
        <Notice tone="info" icon={Info} className="mt-3">{av.BEST_DATE_NOTE}</Notice>
      </Card>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader title="Comparison" action={<div className="flex gap-2">{['institution', 'year'].map((b) => <button key={b} onClick={() => set({ by: b })} aria-pressed={f.by === b} className={cn('min-h-[36px] rounded-pill border px-3 text-xs font-semibold capitalize', f.by === b ? 'border-navy bg-navy text-white' : 'border-lavender-300')}>By {b}</button>)}</div>} />
          <div className="h-72" role="img" aria-label={`Submission rate and Saturday availability by ${f.by}`}><ResponsiveContainer><BarChart data={cmp} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="name" fontSize={11} tickFormatter={(v) => (v.length > 14 ? `${v.slice(0, 12)}…` : v)} /><YAxis fontSize={12} /><Tooltip /><Legend /><Bar dataKey="submissionRate" name="Submission rate %" fill="#0f8a76" radius={[4, 4, 0, 0]} /><Bar dataKey="satAvailable" name="Available on Saturday (students)" fill="#1f3763" radius={[4, 4, 0, 0]} /></BarChart></ResponsiveContainer></div>
        </Card>
        <Card><CardHeader title="Submission-rate trend" />
          <div className="h-72" role="img" aria-label="Weekly availability submission rate trend"><ResponsiveContainer><LineChart data={trend.map((t) => ({ ...t, label: fmtShort(t.weekStart) }))} margin={{ left: -15 }}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" fontSize={12} /><YAxis domain={[0, 100]} unit="%" fontSize={12} /><Tooltip formatter={(v) => `${v}%`} /><Line dataKey="submissionRate" name="Submission rate" stroke="#0f8a76" strokeWidth={2} /></LineChart></ResponsiveContainer></div>
          <p className="mt-2 text-xs text-ink-mute">Future weeks are still open, so their rate may rise before the deadline.</p></Card>
      </div>
    </>
  );
}

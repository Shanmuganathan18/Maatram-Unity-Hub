import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Eye, SearchX } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterBar, LinkButton, Modal, Notice, PageHeader, PendingTag, SearchInput, SelectField, StatusBadge, Tabs } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { getEvent, listResponses, promoteFromWaitlist, waitlistPosition } from '../services/eventService';
import { institutionOptions } from '../services/availabilityService';
import { instName } from '../services/zoneScopeService';
import { appConfig } from '../config/appConfig';
import { fmtInstant } from '../utils/dates';

const D = { response: '', q: '', institution: '' };
export default function EventResponses() {
  const { eventId } = useParams(); const { oid } = useAuth(); useStore();
  const [f, set, clear, active] = useQueryState(D); const [view, setView] = useState(null);
  const e = getEvent(oid, eventId); usePageTitle('Event responses');
  if (!e) return <EmptyState icon={SearchX} title="Event not found" text="This event doesn’t exist or isn’t in your zone." action={<LinkButton to="/events" variant="secondary">Back to events</LinkButton>} />;
  const all = listResponses(oid, eventId); const rows = listResponses(oid, eventId, { response: f.response, q: f.q, institutionId: f.institution });
  const s = e.stats; const tabs = [{ id: '', label: 'All', count: all.length }, { id: 'pending', label: 'Pending', count: s.pending }, { id: 'accepted', label: 'Accepted / Confirmed', count: s.accepted }, { id: 'declined', label: 'Declined', count: s.declined }, { id: 'withdrawn', label: 'Withdrawn', count: s.withdrawn }, ...(e.capacity ? [{ id: 'waitlisted', label: 'Waitlisted', count: s.waitlisted }] : [])];
  const promote = async (r) => { try { await promoteFromWaitlist(oid, eventId, r.id); toast.success(`${r.student.name} moved to confirmed.`); } catch (er) { toast.error(er.message); } };
  return (
    <>
      <Link to={`/events/${eventId}`} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-700"><ArrowLeft className="h-4 w-4" />{e.title}</Link>
      <PageHeader title="Event responses" subtitle="Student responses to the invitation. Responses are separate from weekly availability and from attendance." />
      {e.capacity && <Notice tone="info" className="mb-4">Capacity {e.capacity}: {s.accepted} confirmed, {s.seatsLeft} seat(s) left, {s.waitlisted} waitlisted. Waitlist order is by response time as a placeholder (<PendingTag />).</Notice>}
      <Notice tone="neutral" className="mb-4">Overriding a student’s response is <PendingTag /> (<code>canOverrideResponses = {String(appConfig.permissions.canOverrideResponses)}</code>) – this view is read-only.</Notice>
      <Tabs label="Response status" tabs={tabs} value={f.response} onChange={(v) => set({ response: v })} />
      <FilterBar onClear={clear} active={!!(f.q || f.institution)}>
        <SearchInput id="rq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Name or student ID" />
        <SelectField id="ri" label="Institution" value={f.institution} onChange={(v) => set({ institution: v })} options={institutionOptions(oid).filter((i) => e.targetInstitutionIds.includes(i.id)).map((i) => ({ value: i.id, label: i.name }))} />
      </FilterBar>
      <Card className="p-0 sm:p-0">
        <DataTable caption="Responses" rows={rows} empty={<EmptyState title="No responses in this view" />}
          columns={[{ key: 's', label: 'Student', render: (r) => <><Link to={`/students/${r.student.id}`} className="font-semibold text-navy hover:underline">{r.student.name}</Link><span className="block text-xs text-ink-mute">{r.student.studentId}</span></> }, { key: 'i', label: 'Institution', render: (r) => instName(r.student.institutionId) }, { key: 'dy', label: 'Dept · Year', render: (r) => `${r.student.department} · Y${r.student.year}` },
            { key: 'r', label: 'Response', render: (r) => <><StatusBadge kind={r.response} />{r.response === 'waitlisted' && <span className="ml-1 text-xs">#{waitlistPosition(oid, eventId, r.id)}</span>}</> }, { key: 'd', label: 'Response date', render: (r) => (r.respondedAt ? fmtInstant(r.respondedAt) : '—') },
            { key: 'a', label: 'Answers', render: (r) => (e.questions.length && r.response === 'accepted' ? <Button size="sm" variant="ghost" onClick={() => setView(r)}><Eye className="h-4 w-4" />View</Button> : '—') },
            ...(e.capacity ? [{ key: 'p', label: 'Waitlist', render: (r) => (r.response === 'waitlisted' ? <Button size="sm" variant="outline" disabled={!s.seatsLeft} onClick={() => promote(r)}>Promote</Button> : '—') }] : [])]}
          renderCard={(r) => <div><div className="flex justify-between gap-2"><Link to={`/students/${r.student.id}`} className="font-bold text-navy">{r.student.name}</Link><StatusBadge kind={r.response} /></div><p className="text-xs text-ink-soft">{instName(r.student.institutionId)} · {r.student.department} · Y{r.student.year}</p><p className="text-xs text-ink-mute">{r.respondedAt ? fmtInstant(r.respondedAt) : 'No response yet'}</p>{e.questions.length > 0 && r.response === 'accepted' && <Button size="sm" variant="ghost" onClick={() => setView(r)}>View answers</Button>}{r.response === 'waitlisted' && <Button size="sm" variant="outline" className="mt-2" disabled={!s.seatsLeft} onClick={() => promote(r)}>Promote</Button>}</div>} />
      </Card>
      <Modal open={!!view} onOpenChange={(o) => !o && setView(null)} title={`Answers – ${view?.student.name ?? ''}`} description={e.title} footer={<Button variant="outline" onClick={() => setView(null)}>Close</Button>}>
        <dl className="space-y-3 text-sm">{e.questions.map((q) => <div key={q.id}><dt className="font-semibold text-navy">{q.label}</dt><dd className="text-ink-soft">{view?.answers[q.id] || <i>No answer</i>}</dd></div>)}</dl></Modal>
    </>
  );
}

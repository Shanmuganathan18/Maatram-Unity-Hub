import { useState } from 'react';
import { useFieldArray, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { ArrowLeft, Plus, Save, Send, Trash2, TriangleAlert, Info } from 'lucide-react';
import { Button, Card, CardHeader, Field, LinkButton, Notice, PageHeader, PendingTag } from '../components/ui';
import { CheckGroup } from '../components/events/CheckGroup';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import { audienceOptions, createEvent, findConflicts, physicalEligibility, targetStudents } from '../services/eventService';
import { institutionOptions } from '../services/availabilityService';
import { eventSchema } from '../utils/validators';
import { appConfig, eventCategories } from '../config/appConfig';
import { fmtDate, todayIST } from '../utils/dates';
import { now } from '../services/store';

const defaults = { title: '', category: '', description: '', organizer: '', contact: '', targetInstitutionIds: [], departments: [], years: [], groups: [], date: '', startTime: '', endTime: '', responseDeadline: '', mode: 'physical', venue: '', address: '', platform: '', link: '', instructions: '', capacityEnabled: false, capacity: undefined, waitlistEnabled: false, questions: [] };
const Section = ({ n, title, children }) => <Card><CardHeader title={`${n}. ${title}`} />{children}</Card>;

export default function CreateEvent() {
  usePageTitle('Create event');
  const { oid, officer } = useAuth(); const nav = useNavigate();
  const [busy, setBusy] = useState('');
  const { register, handleSubmit, watch, setValue, control, formState: { errors } } = useForm({ resolver: zodResolver(eventSchema), defaultValues: { ...defaults, organizer: `${officer.name} (${officer.designation})`, contact: officer.email } });
  const { fields, append, remove } = useFieldArray({ control, name: 'questions' });
  const v = watch(); const opts = audienceOptions(oid);
  const draft = { ...v, id: 'draft', questions: [] };
  const est = targetStudents(oid, draft).length;
  const pv = v.category === 'physical_verification' && v.date && v.targetInstitutionIds.length ? physicalEligibility(oid, draft) : null;
  const conflicts = v.date && v.startTime && v.endTime && v.targetInstitutionIds.length ? findConflicts(oid, draft) : [];
  const canPublish = appConfig.permissions.canPublishEvents;
  const cap = appConfig.features.capacityWaitlist;

  const submit = (send) => handleSubmit(async (d) => {
    setBusy(send ? 'send' : 'draft');
    try {
      const questions = d.questions.map((q) => ({ id: q.id, label: q.label.trim(), type: q.type, required: q.required, ...(['single', 'multiple'].includes(q.type) ? { options: q.optionsText.split('\n').map((x) => x.trim()).filter(Boolean) } : {}) }));
      const e = await createEvent(oid, { ...d, questions, capacity: d.capacityEnabled ? Number(d.capacity) : null, waitlistEnabled: d.capacityEnabled && d.waitlistEnabled, responseDeadline: `${d.responseDeadline}:00+05:30`.replace('::', ':') }, { send });
      toast.success(send ? 'Event created and invitations sent.' : 'Event saved as draft.'); nav(`/events/${e.id}`);
    } catch (er) { toast.error(er.message); } finally { setBusy(''); }
  }, () => toast.error('Please fix the highlighted fields.'))();

  return (
    <>
      <LinkButton to="/events" variant="ghost" size="sm" className="mb-2"><ArrowLeft className="h-4 w-4" />Events</LinkButton>
      <PageHeader title="Create event" subtitle={`Targets are limited to institutions and students of ${officer.zoneLabel}.`} />
      <form onSubmit={(e) => e.preventDefault()} noValidate className="space-y-4">
        <Section n={1} title="Basic details">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Event title *" htmlFor="title" error={errors.title?.message}><input id="title" className="field" {...register('title')} /></Field>
            <Field label="Category *" htmlFor="category" error={errors.category?.message}><select id="category" className="field" {...register('category')}><option value="">Select…</option>{Object.entries(eventCategories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
            <div className="sm:col-span-2"><Field label="Description *" htmlFor="description" error={errors.description?.message}><textarea id="description" rows={3} className="field" {...register('description')} /></Field></div>
            <Field label="Organizer *" htmlFor="organizer" error={errors.organizer?.message}><input id="organizer" className="field" {...register('organizer')} /></Field>
            <Field label="Contact information *" htmlFor="contact" error={errors.contact?.message}><input id="contact" className="field" {...register('contact')} /></Field>
          </div>
        </Section>

        <Section n={2} title="Target audience">
          <div className="space-y-4">
            <CheckGroup legend="Target institutions *" options={institutionOptions(oid).map((i) => ({ value: i.id, label: i.name }))} value={v.targetInstitutionIds} onChange={(x) => setValue('targetInstitutionIds', x, { shouldValidate: true })} error={errors.targetInstitutionIds?.message} />
            <CheckGroup legend="Departments (none = all)" options={opts.departments} value={v.departments} onChange={(x) => setValue('departments', x)} />
            <CheckGroup legend="Academic year (none = all)" options={[1, 2, 3, 4].map((y) => ({ value: y, label: `Year ${y}` }))} value={v.years} onChange={(x) => setValue('years', x)} />
            <CheckGroup legend="Student groups (none = all)" options={opts.groups} value={v.groups} onChange={(x) => setValue('groups', x)} />
            <p className="rounded-xl bg-lavender-50 p-3 text-sm"><b>Estimated target students: {est}</b> {v.category === 'physical_verification' && pv && <> · eligible for invitation: <b>{pv.eligible.length}</b></>}</p>
          </div>
        </Section>

        <Section n={3} title="Date and time">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Event date *" htmlFor="date" error={errors.date?.message}><input id="date" type="date" min={todayIST(now())} className="field" {...register('date')} /></Field>
            <Field label="Start time *" htmlFor="st" error={errors.startTime?.message}><input id="st" type="time" className="field" {...register('startTime')} /></Field>
            <Field label="End time *" htmlFor="et" error={errors.endTime?.message}><input id="et" type="time" className="field" {...register('endTime')} /></Field>
            <Field label="Response deadline *" htmlFor="rd" error={errors.responseDeadline?.message}><input id="rd" type="datetime-local" className="field" {...register('responseDeadline')} /></Field>
          </div>
          <p className="mt-2 text-xs text-ink-mute">Times are in IST (Asia/Kolkata).</p>
          {conflicts.length > 0 && <Notice tone="warn" icon={TriangleAlert} title="Possible conflict (not blocking)" className="mt-3">{conflicts.map((c) => <p key={c.event.id}>{c.event.title} on {fmtDate(c.event.date)} targets {c.sharedStudents} of the same students{c.exactTime ? ' at an overlapping time' : ' (times not both set)'}.</p>)}</Notice>}
        </Section>

        {v.category === 'physical_verification' && (
          <Section n="3b" title="Physical verification eligibility">
            <Notice tone="info" icon={Info}>Rule (<PendingTag />): a targeted student is invited only if they marked <b>Available</b> on the event date. Original availability is never changed, and being Available is not acceptance.</Notice>
            {!pv ? <p className="mt-3 text-sm text-ink-soft">Choose a date and at least one institution to preview eligibility.</p> : (
              <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
                <div className="rounded-xl bg-emerald-50 p-3"><b className="text-xl text-emerald-800">{pv.eligible.length}</b><br />Eligible – will be invited</div>
                <div className="rounded-xl bg-rose-50 p-3"><b className="text-xl text-rose-800">{pv.counts.unavailable}</b><br />Marked Unavailable</div>
                <div className="rounded-xl bg-slate-100 p-3"><b className="text-xl text-slate-800">{pv.counts.notSubmitted}</b><br />No valid availability</div>
                <details className="sm:col-span-3"><summary className="cursor-pointer font-semibold text-navy">Why students are excluded ({pv.excluded.length})</summary><ul className="mt-2 max-h-48 space-y-1 overflow-y-auto">{pv.excluded.map((x) => <li key={x.student.id} className="text-xs"><b>{x.student.name}</b> ({x.student.studentId}): {x.reason}</li>)}</ul></details></div>)}
          </Section>)}

        <Section n={4} title="Event location">
          <div className="mb-4 flex gap-2" role="radiogroup" aria-label="Event mode">{['physical', 'online'].map((m) => <label key={m} className={`flex min-h-[44px] cursor-pointer items-center gap-2 rounded-xl border px-4 text-sm font-semibold ${v.mode === m ? 'border-brand-600 bg-brand-50' : 'border-lavender-300'}`}><input type="radio" value={m} className="accent-brand-700" {...register('mode')} />{m === 'physical' ? 'Physical event' : 'Online event'}</label>)}</div>
          {v.mode === 'physical' ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Venue name *" htmlFor="venue" error={errors.venue?.message}><input id="venue" className="field" {...register('venue')} /></Field><Field label="Address" htmlFor="addr"><input id="addr" className="field" {...register('address')} /></Field></div>
            : <div className="grid gap-4 sm:grid-cols-2"><Field label="Platform *" htmlFor="plat" error={errors.platform?.message}><input id="plat" className="field" placeholder="Zoom / Google Meet" {...register('platform')} /></Field><Field label="Meeting link *" htmlFor="link" error={errors.link?.message}><input id="link" className="field" placeholder="https://…" {...register('link')} /></Field></div>}
          <div className="mt-4"><Field label="Instructions" htmlFor="ins"><textarea id="ins" rows={2} className="field" {...register('instructions')} /></Field></div>
        </Section>

        <Section n={5} title="Custom questions for students">
          <div className="space-y-3">{fields.map((f, i) => { const t = v.questions?.[i]?.type; return (
            <div key={f.id} className="rounded-2xl border border-lavender-300 p-3">
              <div className="grid gap-3 sm:grid-cols-[1fr_180px_auto]">
                <Field label={`Question ${i + 1}`} htmlFor={`ql${i}`} error={errors.questions?.[i]?.label?.message}><input id={`ql${i}`} className="field" placeholder="e.g. Do you require transportation?" {...register(`questions.${i}.label`)} /></Field>
                <Field label="Type" htmlFor={`qt${i}`}><select id={`qt${i}`} className="field" {...register(`questions.${i}.type`)}><option value="short">Short text</option><option value="long">Long text</option><option value="single">Single choice</option><option value="multiple">Multiple choice</option><option value="yesno">Yes / No</option></select></Field>
                <div className="flex items-end gap-2"><label className="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" {...register(`questions.${i}.required`)} />Required</label><Button variant="ghost" size="sm" aria-label={`Remove question ${i + 1}`} onClick={() => remove(i)}><Trash2 className="h-4 w-4 text-rose-700" /></Button></div></div>
              {['single', 'multiple'].includes(t) && <div className="mt-3"><Field label="Options (one per line)" htmlFor={`qo${i}`} error={errors.questions?.[i]?.optionsText?.message ?? errors.questions?.[i]?.message}><textarea id={`qo${i}`} rows={3} className="field" {...register(`questions.${i}.optionsText`)} /></Field></div>}
            </div>); })}
            <Button variant="secondary" onClick={() => append({ id: `q${Date.now()}`, label: '', type: 'short', required: false, optionsText: '' })}><Plus className="h-4 w-4" />Add question</Button></div>
        </Section>

        {cap && <Section n={6} title="Capacity and waitlist (optional)">
          <label className="flex min-h-[44px] items-center gap-2 text-sm font-semibold"><input type="checkbox" className="h-4 w-4 accent-brand-700" {...register('capacityEnabled')} />Limit the number of seats</label>
          {v.capacityEnabled && <div className="mt-3 grid gap-4 sm:grid-cols-2"><Field label="Maximum capacity" htmlFor="cap" error={errors.capacity?.message}><input id="cap" type="number" min="1" className="field" {...register('capacity')} /></Field>
            <label className="flex min-h-[44px] items-center gap-2 self-end text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" {...register('waitlistEnabled')} />Enable waitlist</label></div>}
          <Notice tone="warn" className="mt-3">Waitlist priority is <PendingTag />. The prototype orders the waitlist by response time as a placeholder – the client has not confirmed the rule.</Notice>
        </Section>}

        <Section n={7} title="Invitation settings">
          <div className="space-y-2 text-sm">
            <p>Invitations go only to students in the target audience{v.category === 'physical_verification' ? ' who are eligible (see 3b)' : ''}. Students respond separately from their weekly availability.</p>
            <p className="rounded-xl bg-lavender-50 p-3"><b>Reminder preview:</b> if sent now, about <b>{v.category === 'physical_verification' && pv ? pv.eligible.length : est}</b> students would be invited. Before the response deadline, only students who have <i>not responded</i> would receive a reminder (nothing is sent in the prototype).</p>
            {!canPublish && <Notice tone="warn">Publishing is <PendingTag /> for this account – you can save a draft only.</Notice>}
            {appConfig.permissions.publishRequiresApproval && <Notice tone="info">Approval is required before publishing (configured).</Notice>}
          </div>
        </Section>

        <div className="sticky bottom-3 z-10 flex flex-col gap-2 rounded-2xl border border-lavender-300 bg-white/95 p-3 shadow-pop backdrop-blur sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => submit(false)} loading={busy === 'draft'}><Save className="h-4 w-4" />Save as draft</Button>
          <Button onClick={() => submit(true)} disabled={!canPublish} loading={busy === 'send'} title={canPublish ? '' : 'Pending client confirmation'}><Send className="h-4 w-4" />Create & send invitations</Button>
        </div>
      </form>
    </>
  );
}

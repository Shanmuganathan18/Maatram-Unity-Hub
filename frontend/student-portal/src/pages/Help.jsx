import { Mail, Copy, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardHeader, PageHeader } from '../components/ui';
import { usePageTitle } from '../hooks/useStore';
import { appConfig } from '../config/appConfig';
import { useAuth } from '../hooks/useAuth';

const faqs = [
  ['How does weekly availability work?', 'Every week, mark each day as Free (Available) or Busy (Unavailable) – optionally with Morning/Afternoon/Evening slots. Save a draft any time, then Submit before the Friday 6:00 PM (IST) deadline. You can update a submitted week until the deadline. The office team uses this to plan events.'],
  ['How do I repeat the previous week?', 'On the Availability page tap “Repeat Previous Week”. Weekdays are mapped to the same weekdays (Mon→Mon), not literal dates. You can then change any day and tap Undo if you change your mind. Templates also let you save and reuse patterns.'],
  ['What does System-Assumed Unavailable mean?', 'If no submitted availability exists by the deadline (a saved draft is not a submission), the week is recorded as System-Assumed Unavailable. This is different from you marking dates as Busy, which is an explicit answer.'],
  ['Does being Available mean I accepted an event?', 'No. Weekly availability is planning information. When an invitation arrives you must open it and choose Accept or Decline yourself.'],
  ['How do I respond to event invitations?', 'Open Events, pick an invitation, answer any organiser questions, then Accept or Decline (a reason may be required). You can change or withdraw your response until the event’s response deadline, if the event allows it.'],
  ['How do I update my profile?', 'Open Profile. You can edit your phone number, alternate email and photo. Institution, department, year and zone are assigned – contact your coordinator to change them.'],
  ['How do I contact support?', 'Use the contact options below.'],
];

export default function Help() {
  usePageTitle('Help & FAQ');
  const { student } = useAuth();
  const s = appConfig.support;
  const copy = async () => { try { await navigator.clipboard.writeText(s.email); toast.success('Support email copied.'); } catch { toast.error('Could not copy. Please copy the email manually.'); } };
  return (
    <>
      <PageHeader title="Help & FAQ" subtitle="Quick answers about the Student Portal." />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-2 lg:col-span-2">{faqs.map(([q, a]) => (
          <details key={q} className="card group p-4"><summary className="cursor-pointer list-none text-base font-bold text-navy marker:hidden">{q}</summary><p className="mt-2 text-sm text-ink-soft">{a}</p></details>))}</div>
        <Card className="h-fit">
          <CardHeader title="Contact support" />
          <p className="text-sm text-ink-soft">Your coordinator: <b>{student.coordinator}</b></p>
          <p className="mt-1 text-xs text-ink-mute">Demo contact details (fictional). Hours: {s.hours}.</p>
          <div className="mt-3 grid gap-2">
            <a className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-brand-700 px-4 text-sm font-semibold text-white hover:bg-brand-800" href={`mailto:${s.email}?subject=Student Portal help – ${student.studentId}`}><Mail className="h-4 w-4" />Email support</a>
            <Button variant="outline" onClick={copy}><Copy className="h-4 w-4" />Copy email address</Button>
            <p className="flex items-center gap-2 text-sm text-ink-soft"><Phone className="h-4 w-4" />{s.phone}</p>
          </div>
        </Card>
      </div>
    </>
  );
}

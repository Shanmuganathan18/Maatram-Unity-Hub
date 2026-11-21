import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { ChevronLeft, ChevronRight, Copy, LayoutTemplate, RotateCcw, Save, Send, Undo2, XCircle, Info, ShieldAlert } from 'lucide-react';
import { Button, Card, CardHeader, ConfirmDialog, Notice, PageHeader, StatusBadge } from '../components/ui';
import DeadlineBanner from '../components/availability/DeadlineBanner';
import DayCard from '../components/availability/DayCard';
import EditHistory from '../components/availability/EditHistory';
import TemplatesDialog from '../components/availability/TemplatesDialog';
import { useAuth } from '../hooks/useAuth';
import { useNow, useStore, usePageTitle } from '../hooks/useStore';
import { useWeekEditor } from '../hooks/useWeekEditor';
import * as svc from '../services/availabilityService';
import { fmtInstant, fmtRange, isoWeekNumber, todayIST, weekDays } from '../utils/dates';
import { statusMeta } from '../utils/statusMeta';

export default function Availability() {
  usePageTitle('Weekly availability');
  const { sid } = useAuth();
  const v = useStore();
  const nowMs = useNow(1000);
  const [params, setParams] = useSearchParams();
  const weeks = svc.eligibleWeeks(nowMs);
  const wanted = params.get('week');
  const ws = wanted && weeks.includes(wanted) ? wanted : svc.defaultPlanningWeek(nowMs);
  const info = svc.getWeekInfo(sid, ws, nowMs);
  const ed = useWeekEditor(sid, ws, v);
  const [dlg, setDlg] = useState(null); // 'repeat' | 'allBusy' | 'reset' | 'submit' | 'templates'
  const [busy, setBusy] = useState(false);
  const readOnly = !info.open;
  const isSubmitted = info.state === 'submitted';
  const days = readOnly ? (info.record?.days ?? svc.emptyDays(ws)) : ed.days;
  const counts = svc.summarize(ed.days);
  const goto = (w) => setParams({ week: w }, { replace: true });
  const idx = weeks.indexOf(ws);
  const prevPattern = svc.getPreviousPattern(sid, ws);

  const run = async (fn, ok) => { setBusy(true); try { await fn(); ok && toast.success(ok); } catch (e) { toast.error(e.message); } finally { setBusy(false); setDlg(null); } };
  const doRepeat = () => {
    if (!prevPattern) { toast.error('No pattern found in the previous week to copy.'); setDlg(null); return; }
    ed.replaceAll(svc.patternToWeek(ws, prevPattern)); setDlg(null);
    toast.success('Previous week’s pattern copied. Review it, then save or submit.');
  };

  return (
    <>
      <PageHeader title="Weekly availability" subtitle="Tell the office team when you are free. This is planning information only – you will still accept or decline each event invitation separately." />

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <Button variant="outline" size="sm" onClick={() => goto(weeks[idx - 1])} disabled={idx <= 0} aria-label="Previous week"><ChevronLeft className="h-4 w-4" /></Button>
          <div className="text-center">
            <p className="text-lg font-extrabold text-navy">{fmtRange(ws)}</p>
            <p className="text-xs text-ink-soft">Week {isoWeekNumber(ws)}{ws === svc.defaultPlanningWeek(nowMs) && ' · current planning week'}</p>
          </div>
          <Button variant="outline" size="sm" onClick={() => goto(weeks[idx + 1])} disabled={idx >= weeks.length - 1} aria-label="Next week"><ChevronRight className="h-4 w-4" /></Button>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <label htmlFor="jump" className="sr-only">Jump to week</label>
          <select id="jump" className="field max-w-[260px]" value={ws} onChange={(e) => goto(e.target.value)}>
            {weeks.map((w) => <option key={w} value={w}>{fmtRange(w)} — {statusMeta[svc.getWeekInfo(sid, w, nowMs).state].label}</option>)}
          </select>
          <StatusBadge kind={info.state} />
          {ed.dirty && !readOnly && <span className="text-xs font-semibold text-amber-800">• Unsaved changes</span>}
        </div>
      </Card>

      <div className="mb-4"><DeadlineBanner info={info} nowMs={nowMs} /></div>

      {info.state === 'system_assumed_unavailable' && <Notice tone="warn" icon={ShieldAlert} title="System-Assumed Unavailable" className="mb-4">No submission was received by the deadline. This is different from you marking dates Unavailable. {info.record && 'Your saved draft was never submitted, so it is not counted.'} This week is locked.</Notice>}

      <Card>
        <CardHeader title="Select your dates" action={!readOnly && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="secondary" onClick={() => (ed.hasSelection ? setDlg('repeat') : doRepeat())} disabled={!prevPattern} title={prevPattern ? '' : 'No pattern in previous week'}><Copy className="h-4 w-4" />Repeat Previous Week</Button>
            {ed.canUndo && <Button size="sm" variant="ghost" onClick={ed.undoLast}><Undo2 className="h-4 w-4" />Undo</Button>}
          </div>)} />
        {!readOnly && !prevPattern && <p className="mb-3 text-xs text-ink-soft">Repeat Previous Week is unavailable because the previous week has no saved pattern.</p>}
        <div className="grid gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {weekDays(ws).map((d) => <DayCard key={d} date={d} day={days[d]} readOnly={readOnly} today={todayIST(nowMs) === d} onStatus={ed.setStatus} onSlot={ed.toggleSlot} />)}
        </div>
        <p className="mt-3 flex items-start gap-2 text-xs text-ink-soft"><Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />“Not selected” means you haven’t answered for that date. “Busy” is an explicit answer. Time slots are optional; slots you leave unselected are treated as not free.</p>

        {!readOnly && (
          <div className="mt-4 flex flex-wrap gap-2 border-t border-lavender-200 pt-4">
            <Button variant="outline" size="sm" onClick={() => setDlg('templates')}><LayoutTemplate className="h-4 w-4" />Templates</Button>
            <Button variant="outline" size="sm" onClick={() => setDlg('allBusy')}><XCircle className="h-4 w-4" />Mark all unavailable</Button>
            <Button variant="outline" size="sm" onClick={() => (ed.dirty ? setDlg('reset') : toast.info('No unsaved changes to reset.'))}><RotateCcw className="h-4 w-4" />Reset changes</Button>
          </div>
        )}
      </Card>

      {!readOnly && (
        <div className="sticky bottom-[72px] z-10 mt-4 flex flex-col gap-2 rounded-2xl border border-lavender-300 bg-white/95 p-3 shadow-pop backdrop-blur sm:flex-row sm:justify-end md:bottom-3">
          {!isSubmitted && <Button variant="outline" onClick={() => run(() => svc.saveDraft(sid, ws, ed.days), 'Draft saved. It is not submitted yet.')} disabled={!ed.dirty} loading={busy && !dlg}><Save className="h-4 w-4" />Save draft</Button>}
          <Button onClick={() => (ed.hasSelection ? setDlg('submit') : toast.error('Select at least one date first.'))} disabled={isSubmitted && !ed.dirty}><Send className="h-4 w-4" />{isSubmitted ? 'Update availability' : 'Submit availability'}</Button>
        </div>
      )}

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Timestamps" />
          <dl className="space-y-2 text-sm">
            {[['Last saved', info.record?.lastSavedAt], ['Submitted', info.record?.submittedAt], ['Last updated', info.record?.status === 'submitted' ? info.record.updatedAt : null]].map(([k, t]) => <div key={k} className="flex justify-between gap-3"><dt className="text-ink-soft">{k}</dt><dd className="font-semibold text-navy">{t ? fmtInstant(t) : '—'}</dd></div>)}
          </dl>
        </Card>
        <Card><CardHeader title="Edit history" /><EditHistory history={info.record?.history} /></Card>
      </div>

      <ConfirmDialog open={dlg === 'repeat'} onCancel={() => setDlg(null)} onConfirm={doRepeat} title="Replace current selections?" description="Repeat Previous Week will overwrite what you have selected for this week. You can undo right after." confirmLabel="Copy previous week" />
      <ConfirmDialog open={dlg === 'allBusy'} onCancel={() => setDlg(null)} onConfirm={() => { ed.markAllUnavailable(); setDlg(null); toast.success('All dates marked Unavailable (not saved yet).'); }} title="Mark all dates unavailable?" description="Every day this week will be set to Unavailable. This is an explicit answer, not a missed submission." confirmLabel="Mark all unavailable" tone="danger" />
      <ConfirmDialog open={dlg === 'reset'} onCancel={() => setDlg(null)} onConfirm={() => { ed.reset(); setDlg(null); toast.success('Unsaved changes discarded.'); }} title="Discard unsaved changes?" description="Your selections will go back to the last saved version." confirmLabel="Discard changes" tone="danger" />
      <ConfirmDialog open={dlg === 'submit'} loading={busy} onCancel={() => setDlg(null)} onConfirm={() => run(() => svc.submitWeek(sid, ws, ed.days), isSubmitted ? 'Availability updated.' : 'Availability submitted.')} title={isSubmitted ? 'Update availability?' : 'Submit availability?'} description={`${fmtRange(ws)}: ${counts.available} available, ${counts.unavailable} unavailable, ${counts.none} not selected.`} confirmLabel={isSubmitted ? 'Update' : 'Submit'}>
        <p className="text-sm text-ink-soft">Dates left “Not selected” stay that way (they are not recorded as Unavailable). You can still update until the deadline. Submitting availability does <b>not</b> accept any event invitation.</p>
      </ConfirmDialog>
      <TemplatesDialog open={dlg === 'templates'} onOpenChange={(o) => setDlg(o ? 'templates' : null)} sid={sid} currentPattern={svc.daysToPattern(ws, ed.days)} canApply={!readOnly} onApply={(t) => { ed.replaceAll(svc.patternToWeek(ws, t.pattern)); toast.success(`Template “${t.name}” applied. Review and submit when ready.`); }} />
    </>
  );
}

import { useState } from 'react';
import { LifeBuoy, Lock, Paperclip } from 'lucide-react';
import { Button, Card, DataTable, EmptyState, FilterBar, Modal, Notice, PageHeader, SearchInput, SelectField, StatusBadge, Badge } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useQueryState } from '../hooks/useQueryState';
import { useAction } from '../hooks/useAction';
import { addMessage, adminOptions, assignTicket, getTicket, listTickets, setTicketStatus } from '../services/supportService';
import { studentFilterOptions } from '../services/studentService';
import { fmtInstant } from '../utils/dates';
import { cn } from '../utils/cn';

const STATUS = ['Open', 'In Progress', 'Waiting for User', 'Resolved', 'Closed']; const D = { q: '', status: '', priority: '', zone: '', overdue: '' };
export default function Support() {
  usePageTitle('Support tickets'); const { aid } = useAuth(); const { can } = usePermissions(); useStore(); const [f, set, clear, active] = useQueryState(D); const [open, setOpen] = useState(null); const [text, setText] = useState(''); const [internal, setInternal] = useState(false); const [run, busy] = useAction();
  const rows = listTickets(aid, { q: f.q, status: f.status, priority: f.priority, zoneId: f.zone, overdue: f.overdue }); const t = open ? getTicket(aid, open) : null; const manage = can('support.manage');
  const cols = [{ key: 'id', label: 'Ticket', render: (x) => <span className="font-mono text-xs">{x.id}</span> }, { key: 's', label: 'Subject', render: (x) => <button className="text-left font-semibold text-navy hover:underline" onClick={() => setOpen(x.id)}>{x.subject}</button> }, { key: 'b', label: 'Submitted by', render: (x) => `${x.submittedBy} (${x.userRole})` }, { key: 'z', label: 'Zone', render: (x) => x.zoneLabel }, { key: 'c', label: 'Category', render: (x) => x.category }, { key: 'p', label: 'Priority', render: (x) => <StatusBadge kind={x.priority} /> }, { key: 'd', label: 'Created', render: (x) => <>{fmtInstant(x.createdAt, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}{x.overdue && <Badge className="ml-1 border-rose-300 bg-rose-50 text-rose-800">Overdue</Badge>}</> }, { key: 'st', label: 'Status', render: (x) => <StatusBadge kind={x.status} /> }, { key: 'a', label: 'Assignee', render: (x) => x.assigneeName }];
  return (<>
    <PageHeader title="Support tickets" subtitle="Requests from students and officers. Internal notes are never shown to the submitter." />
    <FilterBar onClear={clear} active={active}>
      <SearchInput id="tq" value={f.q} onChange={(v) => set({ q: v })} placeholder="Ticket ID, subject or name" />
      <SelectField id="ts" label="Status" value={f.status} onChange={(v) => set({ status: v })} options={STATUS} /><SelectField id="tp" label="Priority" value={f.priority} onChange={(v) => set({ priority: v })} options={['Low', 'Medium', 'High', 'Urgent']} />
      <SelectField id="tz" label="Zone" value={f.zone} onChange={(v) => set({ zone: v })} options={studentFilterOptions().zones} /><SelectField id="to" label="SLA" value={f.overdue} onChange={(v) => set({ overdue: v })} options={[{ value: '1', label: 'Overdue only' }]} all="All" />
    </FilterBar>
    <Card className="p-0 sm:p-0"><DataTable caption="Tickets" columns={cols} rows={rows} empty={<EmptyState icon={LifeBuoy} title="No tickets match" />} renderCard={(x) => <div><div className="flex justify-between gap-2"><button className="text-left font-bold text-navy" onClick={() => setOpen(x.id)}>{x.subject}</button><StatusBadge kind={x.status} /></div><p className="text-xs text-ink-soft">{x.id} · {x.submittedBy} · {x.zoneLabel}</p><div className="mt-1 flex gap-2"><StatusBadge kind={x.priority} />{x.overdue && <Badge className="border-rose-300 bg-rose-50 text-rose-800">Overdue</Badge>}</div></div>} /></Card>
    <Modal open={!!t} onOpenChange={(o) => !o && setOpen(null)} size="lg" title={t ? `${t.id} · ${t.subject}` : ''} description={t ? `${t.submittedBy} (${t.userRole}) · ${t.zoneLabel} · ${t.category}` : ''} footer={<Button variant="outline" onClick={() => setOpen(null)}>Close</Button>}>
      {t && <div className="space-y-4 text-sm">
        <div className="flex flex-wrap items-center gap-2"><StatusBadge kind={t.status} /><StatusBadge kind={t.priority} />{t.overdue && <Badge className="border-rose-300 bg-rose-50 text-rose-800">Overdue</Badge>}<span className="text-ink-soft">Assignee: <b>{t.assigneeName}</b></span></div>
        {manage ? <div className="grid gap-3 sm:grid-cols-2"><div><label htmlFor="tst" className="label">Status</label><select id="tst" className="field" value={t.status} onChange={(e) => run(() => setTicketStatus(aid, t.id, e.target.value), 'Status updated.')}>{STATUS.map((s) => <option key={s}>{s}</option>)}</select></div>
          <div><label htmlFor="tas" className="label">Assign to</label><select id="tas" className="field" value={t.assignee ?? ''} onChange={(e) => run(() => assignTicket(aid, t.id, e.target.value), 'Assignment updated.')}><option value="">Unassigned</option>{adminOptions().map((a) => <option key={a.value} value={a.value}>{a.label}</option>)}</select></div></div> : <Notice tone="neutral">Read-only: your role cannot change or reply to tickets.</Notice>}
        <div><p className="mb-2 font-bold text-navy">Conversation</p><ul className="space-y-2">{t.messages.map((m) => <li key={m.id} className={cn('rounded-xl border p-3', m.internal ? 'border-amber-300 bg-amber-50' : 'border-lavender-200 bg-white')}><p className="flex flex-wrap items-center gap-2 text-xs text-ink-mute"><b className="text-navy">{m.who}</b> ({m.role}) · {fmtInstant(m.at)}{m.internal && <span className="flex items-center gap-1 font-bold text-amber-800"><Lock className="h-3 w-3" />Internal note – hidden from submitter</span>}</p><p className="mt-1">{m.text}</p></li>)}</ul>
          <p className="mt-2 flex items-center gap-1 text-xs text-ink-mute"><Paperclip className="h-3 w-3" />Attachments preview: placeholder (no files in the prototype)</p></div>
        {manage && <div><label htmlFor="trp" className="label">{internal ? 'Internal note' : 'Reply to submitter'}</label><textarea id="trp" rows={3} className="field" value={text} onChange={(e) => setText(e.target.value)} />
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2"><label className="flex items-center gap-2 text-sm"><input type="checkbox" className="h-4 w-4 accent-brand-700" checked={internal} onChange={(e) => setInternal(e.target.checked)} />Internal note (not visible to submitter)</label><Button loading={busy} onClick={async () => { const r = await run(() => addMessage(aid, t.id, text, internal), internal ? 'Internal note added.' : 'Reply recorded (mock – not delivered).'); if (r.ok) setText(''); }}>{internal ? 'Add note' : 'Send reply'}</Button></div></div>}
        <div><p className="mb-1 font-bold text-navy">Status history</p><ul className="space-y-1 text-xs text-ink-soft">{t.history.map((h, i) => <li key={i}>{fmtInstant(h.at)} – {h.text}</li>)}</ul></div></div>}</Modal>
  </>);
}

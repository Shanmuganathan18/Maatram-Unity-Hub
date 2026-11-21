import { useState } from 'react';
import { Pencil, Trash2, Save, Check } from 'lucide-react';
import { toast } from 'sonner';
import { Button, EmptyState, Modal, Notice } from '../ui';
import { createTemplate, deleteTemplate, listTemplates, renameTemplate } from '../../services/availabilityService';
import { describeDay } from '../../services/availabilityService';

const preview = (p) => p.map((d, i) => `${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i]}: ${describeDay(d)}`).join(' · ');

export default function TemplatesDialog({ open, onOpenChange, sid, currentPattern, canApply, onApply }) {
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(null);
  const [editName, setEditName] = useState('');
  const [busy, setBusy] = useState(false);
  const list = listTemplates(sid);

  const run = async (fn, ok) => { setBusy(true); try { await fn(); ok && toast.success(ok); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };
  return (
    <Modal open={open} onOpenChange={onOpenChange} size="lg" title="Availability templates" description="Templates are shortcuts for common weekly patterns. Applying one only fills the form – you still review and submit it. A template is not a commitment to attend events.">
      <div className="space-y-3">
        {list.length === 0 && <EmptyState title="No templates yet" text="Save your current selection below to reuse it in future weeks." />}
        {list.map((t) => (
          <div key={t.id} className="rounded-xl border border-lavender-200 p-3">
            {editing === t.id ? (
              <div className="flex gap-2"><input aria-label="Template name" className="field" value={editName} maxLength={40} onChange={(e) => setEditName(e.target.value)} />
                <Button size="sm" loading={busy} onClick={() => run(async () => { await renameTemplate(sid, t.id, editName); setEditing(null); }, 'Template renamed')}><Check className="h-4 w-4" />Save</Button></div>
            ) : (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-navy">{t.name}</p>
                <div className="flex gap-1">
                  <Button size="sm" disabled={!canApply} onClick={() => { onApply(t); onOpenChange(false); }}>Apply</Button>
                  <Button size="sm" variant="ghost" aria-label={`Rename ${t.name}`} onClick={() => { setEditing(t.id); setEditName(t.name); }}><Pencil className="h-4 w-4" /></Button>
                  <Button size="sm" variant="ghost" aria-label={`Delete ${t.name}`} onClick={() => run(() => deleteTemplate(sid, t.id), 'Template deleted')}><Trash2 className="h-4 w-4 text-rose-700" /></Button>
                </div>
              </div>
            )}
            <p className="mt-1 text-xs text-ink-soft">{preview(t.pattern)}</p>
          </div>
        ))}
        {!canApply && <Notice tone="warn">Templates can’t be applied because this week is locked.</Notice>}
        <div className="rounded-xl bg-lavender-50 p-3">
          <label htmlFor="tpl-name" className="label">Save current selection as a template</label>
          <div className="flex gap-2"><input id="tpl-name" className="field" placeholder="e.g. Weekends only" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} />
            <Button loading={busy} onClick={() => run(async () => { await createTemplate(sid, name, currentPattern); setName(''); }, 'Template saved')}><Save className="h-4 w-4" />Save</Button></div>
        </div>
      </div>
    </Modal>
  );
}

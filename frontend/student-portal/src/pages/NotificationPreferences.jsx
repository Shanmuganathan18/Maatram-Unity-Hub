import { useState } from 'react';
import { toast } from 'sonner';
import { Info, Lock } from 'lucide-react';
import { Button, Card, Notice, PageHeader, Switch, Badge } from '../components/ui';
import { useAuth } from '../hooks/useAuth';
import { usePageTitle } from '../hooks/useStore';
import { availableChannels, getPreferences, savePreferences } from '../services/notificationService';
import { notificationCategories } from '../config/appConfig';

export default function NotificationPreferences() {
  usePageTitle('Notification preferences');
  const { sid, student } = useAuth();
  const channels = availableChannels(student);
  const [prefs, setPrefs] = useState(() => structuredClone(getPreferences(sid)));
  const [saved, setSaved] = useState(JSON.stringify(prefs));
  const [busy, setBusy] = useState(false);
  const dirty = JSON.stringify(prefs) !== saved;
  const set = (c, ch, v) => setPrefs((p) => ({ ...p, [c]: { ...p[c], [ch]: v } }));
  const save = async () => { setBusy(true); try { await savePreferences(sid, prefs); setSaved(JSON.stringify(prefs)); toast.success('Preferences saved.'); } catch (e) { toast.error(e.message); } finally { setBusy(false); } };

  return (
    <>
      <PageHeader title="Notification preferences" subtitle="Choose how you would like to hear about each type of update." actions={<Button onClick={save} disabled={!dirty} loading={busy}>Save preferences</Button>} />
      <Notice tone="info" icon={Info} className="mb-4">Preferences don’t guarantee delivery. Only in-app notifications work in this prototype; email, SMS and WhatsApp will be connected by the backend later. Only channels configured on your account are shown. Required notices always stay on in-app. <i>(Which notices are required is a prototype assumption pending client policy.)</i></Notice>
      <Card className="overflow-x-auto p-0 sm:p-0">
        <table className="w-full min-w-[560px] text-sm">
          <thead className="bg-lavender-100 text-left text-xs uppercase text-ink-soft"><tr><th scope="col" className="px-4 py-3">Notification</th>{channels.map((c) => <th key={c.id} scope="col" className="px-3 py-3 text-center">{c.label}</th>)}</tr></thead>
          <tbody className="divide-y divide-lavender-200">{notificationCategories.map((cat) => (
            <tr key={cat.id}><th scope="row" className="px-4 py-3 text-left font-semibold text-navy">{cat.label} {cat.mandatory ? <Badge className="ml-1 border-rose-300 bg-rose-50 text-rose-800"><Lock className="h-3 w-3" />Required</Badge> : <Badge className="ml-1 border-lavender-300 bg-lavender-50 text-ink-soft">Optional</Badge>}</th>
              {channels.map((ch) => <td key={ch.id} className="px-3 py-3 text-center"><div className="flex justify-center"><Switch label={`${cat.label} via ${ch.label}`} checked={ch.locked ? true : !!prefs[cat.id][ch.id]} disabled={ch.locked} onChange={(v) => set(cat.id, ch.id, v)} /></div></td>)}</tr>))}</tbody>
        </table>
      </Card>
      <ul className="mt-3 space-y-1 text-xs text-ink-soft">{channels.map((c) => <li key={c.id}><b>{c.label}:</b> {c.note}</li>)}{!student.phone && <li>Add a phone number in your profile to enable SMS/WhatsApp options.</li>}</ul>
    </>
  );
}

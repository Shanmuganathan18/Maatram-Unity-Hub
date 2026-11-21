import { useState } from 'react';
import { Check, Lock, Save } from 'lucide-react';
import { Button, Card, CardHeader, ConfirmDialog, Field, Notice, PageHeader, PendingTag } from '../components/ui';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../context/PermissionContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { useAction } from '../hooks/useAction';
import { getPermissionHistory, isLocked, permissionsOfRole, savePermissionChanges } from '../services/roleService';
import { adminRoleIds, permissionGroups, roleLabel } from '../config/permissions';
import { fmtInstant } from '../utils/dates';

export default function Permissions() {
  usePageTitle('Permissions'); const { aid, admin } = useAuth(); const { can } = usePermissions(); useStore(); const [staged, setStaged] = useState({}); const [conf, setConf] = useState(false); const [note, setNote] = useState(''); const [run, busy] = useAction();
  const editable = can('roles.manage'); const sets = Object.fromEntries(adminRoleIds.map((r) => [r, permissionsOfRole(r)]));
  const value = (r, k) => (`${r}|${k}` in staged ? staged[`${r}|${k}`] : sets[r].has(k)); const changes = Object.entries(staged).map(([id, value2]) => { const [role, key] = id.split('|'); return { role, key, value: value2 }; });
  const toggle = (r, k) => { const id = `${r}|${k}`; const next = !value(r, k); setStaged((s) => { const n = { ...s }; if (next === sets[r].has(k)) delete n[id]; else n[id] = next; return n; }); };
  const hist = getPermissionHistory(aid);
  return (<>
    <PageHeader title="Permissions" subtitle="Permission matrix for the unified Administrator role. Changes apply system-wide." actions={editable && <Button disabled={!changes.length} onClick={() => setConf(true)}><Save className="h-4 w-4" />Review & save ({changes.length})</Button>} />
    <Notice tone="info" className="mb-4">All administrators share the unified <b>ADMIN</b> role with system-wide permissions across all zones.</Notice>
    <Card className="mb-4 overflow-x-auto p-0 sm:p-0"><table className="w-full min-w-[520px] text-sm"><caption className="sr-only">Permission matrix</caption>
      <thead className="bg-lavender-100 text-xs uppercase text-ink-soft"><tr><th scope="col" className="px-4 py-3 text-left">Permission</th>{adminRoleIds.map((r) => <th key={r} scope="col" className="px-3 py-3 text-center">{roleLabel(r)}</th>)}</tr></thead>
      <tbody>{permissionGroups.map((g) => (<>{<tr key={g.id} className="bg-lavender-50"><th colSpan={4} scope="colgroup" className="px-4 py-2 text-left text-xs font-bold uppercase text-navy">{g.label}</th></tr>}
        {g.perms.map(([k, l]) => <tr key={k} className="border-t border-lavender-200"><th scope="row" className="px-4 py-2 text-left font-medium">{l}<span className="block font-mono text-[11px] font-normal text-ink-mute">{k}</span></th>
          {adminRoleIds.map((r) => { const lock = isLocked(r, k); const on = value(r, k); const dirty = `${r}|${k}` in staged; return <td key={r} className={`px-3 py-2 text-center ${dirty ? 'bg-amber-50' : ''}`}>{editable && !lock ? <input type="checkbox" className="h-5 w-5 accent-brand-700" checked={on} onChange={() => toggle(r, k)} aria-label={`${l} for ${roleLabel(r)}`} /> : <span title={lock || undefined} className="inline-flex items-center justify-center">{on ? <Check className="h-4 w-4 text-emerald-700" aria-label="Granted" /> : <span className="text-slate-400" aria-label="Not granted">–</span>}{lock && <Lock className="ml-1 h-3 w-3 text-ink-mute" />}</span>}</td>; })}</tr>)}</>))}</tbody></table></Card>
    <Card><CardHeader title="Permission change history" />{hist.length === 0 ? <p className="text-sm text-ink-soft">No changes yet.</p> : <ul className="divide-y divide-lavender-200 text-sm">{hist.map((h) => <li key={h.id} className="py-2"><p><b className="text-navy">{h.actorName}</b> · {fmtInstant(h.at)}</p><p className="text-xs text-ink-soft">{h.change}</p>{h.note && <p className="text-xs text-ink-mute">Reason: {h.note}</p>}</li>)}</ul>}</Card>
    <ConfirmDialog open={conf} loading={busy} onCancel={() => setConf(false)} confirmLabel={`Save ${changes.length} change(s)`} title="Save permission changes?" description="Changes take effect immediately for all accounts with these roles in this mock." onConfirm={async () => { const r = await run(() => savePermissionChanges(aid, changes, note), (n) => `${n} permission change(s) saved and audited.`); if (r.ok) { setStaged({}); setNote(''); setConf(false); } }}>
      <ul className="mb-3 max-h-40 list-disc space-y-1 overflow-y-auto pl-5 text-sm">{changes.map((c) => <li key={`${c.role}${c.key}`}><b>{c.value ? 'Grant' : 'Revoke'}</b> {c.key} – {roleLabel(c.role)}</li>)}</ul><Field label="Reason for change *" htmlFor="pr"><textarea id="pr" rows={2} className="field" value={note} onChange={(e) => setNote(e.target.value)} /></Field></ConfirmDialog>
  </>);
}

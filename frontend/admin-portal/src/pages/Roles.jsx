import { useState } from 'react';
import { Check, Lock, Minus } from 'lucide-react';
import { Badge, Card, CardHeader, LinkButton, Notice, PageHeader, PendingTag } from '../components/ui';
import { Can } from '../components/layout/Gate';
import { useAuth } from '../context/AuthContext';
import { usePageTitle, useStore } from '../hooks/useStore';
import { listRoles, permissionsOfRole } from '../services/roleService';
import { permissionGroups } from '../config/permissions';
import { cn } from '../utils/cn';

export default function Roles() {
  usePageTitle('Roles'); const { aid } = useAuth(); useStore(); const roles = listRoles(aid); const [sel, setSel] = useState('admin'); const r = roles.find((x) => x.id === sel) || roles[0]; const perms = permissionsOfRole(r.id);
  return (<>
    <PageHeader title="Roles" subtitle="System roles and their capabilities across all three portals." actions={<Can perm="roles.view"><LinkButton to="/permissions" variant="outline">Open permission matrix</LinkButton></Can>} />
    <Notice tone="info" className="mb-4">The platform enforces a single <b>ADMIN</b> role with identical system-wide access across all zones and records.</Notice>
    <div className="grid gap-4 lg:grid-cols-3">
      <div className="space-y-2">{roles.map((x) => <button key={x.id} onClick={() => setSel(x.id)} aria-pressed={sel === x.id} className={cn('card w-full p-4 text-left', sel === x.id && 'border-brand-500 ring-2 ring-brand-500')}><div className="flex items-center justify-between gap-2"><b className="text-navy">{x.label}</b>{!x.editable && <Badge className="border-lavender-300 bg-lavender-50 text-ink-soft"><Lock className="h-3 w-3" />System-defined</Badge>}</div><p className="mt-1 text-xs text-ink-soft">{x.description}</p><p className="mt-2 text-xs"><b>{x.members}</b> account(s){x.editable && <> · <b>{x.permissionCount}</b> permissions</>}</p></button>)}</div>
      <Card className="lg:col-span-2"><CardHeader title={r.label} />
        {!r.editable ? <><p className="mb-3 text-sm text-ink-soft">{r.description} Its permissions are defined in the {r.id === 'student' ? 'Student' : 'Officer'} Portal and cannot be edited here.</p><ul className="list-disc space-y-1 pl-5 text-sm">{r.caps.map((c) => <li key={c}>{c}</li>)}</ul></>
          : <div className="space-y-4">{permissionGroups.map((g) => <div key={g.id}><p className="mb-1 text-sm font-bold text-navy">{g.label}</p><ul className="grid gap-1 sm:grid-cols-2">{g.perms.map(([k, l]) => <li key={k} className="flex items-center gap-2 text-sm">{perms.has(k) ? <Check className="h-4 w-4 text-emerald-700" aria-label="Granted" /> : <Minus className="h-4 w-4 text-slate-400" aria-label="Not granted" />}<span className={perms.has(k) ? '' : 'text-ink-mute'}>{l}</span></li>)}</ul></div>)}</div>}</Card>
    </div>
  </>);
}

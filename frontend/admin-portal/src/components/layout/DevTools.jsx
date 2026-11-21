import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Modal, Button } from '../ui';
import { setDemoNow, resetStore } from '../../services/store';
import { listDemoAdmins } from '../../services/authService';
import { useAuth } from '../../context/AuthContext';
import { useNow } from '../../hooks/useStore';
import { fmtInstant } from '../../utils/dates';
import { appConfig } from '../../config/appConfig';

const presets = [{ label: 'Wed 4 Nov, 10:00 AM – window open', iso: '2026-11-04T10:00:00+05:30' }, { label: 'Fri 6 Nov, 5:30 PM – closes soon', iso: '2026-11-06T17:30:00+05:30' }, { label: 'Fri 6 Nov, 6:01 PM – week locked', iso: '2026-11-06T18:01:00+05:30' }];
/** DEVELOPER-ONLY: switch mock accounts to test permissions. Hidden when appConfig.demo.showDevTools = false. */
export default function DevTools() {
  const [open, setOpen] = useState(false); const { aid, signIn } = useAuth(); const t = useNow(1000);
  if (!appConfig.demo.showDevTools) return null;
  return (<>
    <button onClick={() => setOpen(true)} className="no-print fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white shadow-pop" aria-label="Open developer tools (demo only)"><Wrench className="h-5 w-5" /></button>
    <Modal open={open} onOpenChange={setOpen} title="Developer tools (demo only)" description="Not part of the production portal. Use it to test administrator switching and demo clock.">
      <p className="mb-2 text-sm font-semibold text-navy">Switch demo admin</p>
      <div className="mb-4 grid gap-2">{listDemoAdmins().map((a) => <Button key={a.id} size="sm" variant={a.id === aid ? 'secondary' : 'outline'} className="justify-between" onClick={() => signIn(a.id)}><span>{a.name}</span><span className="text-xs font-normal">{a.roleLabel}</span></Button>)}</div>
      <p className="mb-2 text-sm font-semibold text-navy">Demo clock (IST): <span className="font-normal">{fmtInstant(t)}</span></p>
      <div className="mb-4 grid gap-2">{presets.map((p) => <Button key={p.iso} size="sm" variant="outline" className="justify-start" onClick={() => setDemoNow(p.iso)}>{p.label}</Button>)}</div>
      <Button variant="danger" size="sm" onClick={() => { resetStore(); setOpen(false); }}>Reset all mock data</Button>
    </Modal></>);
}

import { useState } from 'react';
import { Wrench } from 'lucide-react';
import { Modal, Button } from '../ui';
import { setDemoNow } from '../../services/clock';
import { resetStore } from '../../services/store';
import { listDemoAccounts } from '../../services/profileService';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useStore';
import { fmtInstant } from '../../utils/dates';
import { appConfig } from '../../config/appConfig';

const presets = [
  { label: 'Wed 4 Nov, 10:00 AM – window open', iso: '2026-11-04T10:00:00+05:30' },
  { label: 'Fri 6 Nov, 5:30 PM – closes soon', iso: '2026-11-06T17:30:00+05:30' },
  { label: 'Fri 6 Nov, 6:01 PM – just locked', iso: '2026-11-06T18:01:00+05:30' },
  { label: 'Sat 7 Nov, 9:00 AM – next week open', iso: '2026-11-07T09:00:00+05:30' },
];

/** DEVELOPER TOOL – not a student-facing feature. Hidden when appConfig.demo.showDevTools is false. */
export default function DevTools() {
  const [open, setOpen] = useState(false);
  const { sid, signIn } = useAuth();
  const t = useNow(1000);
  if (!appConfig.demo.showDevTools) return null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="no-print fixed bottom-24 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white shadow-pop lg:bottom-4" aria-label="Open developer tools (demo only)"><Wrench className="h-5 w-5" /></button>
      <Modal open={open} onOpenChange={setOpen} title="Developer tools (demo only)" description="Not part of the student experience. Simulates the clock and switches mock accounts.">
        <p className="mb-2 text-sm font-semibold text-navy">Demo clock (IST): <span className="font-normal">{fmtInstant(t)}</span></p>
        <div className="mb-5 grid gap-2">{presets.map((p) => <Button key={p.iso} variant="outline" size="sm" onClick={() => setDemoNow(p.iso)} className="justify-start">{p.label}</Button>)}</div>
        <p className="mb-2 text-sm font-semibold text-navy">Switch mock account</p>
        <div className="mb-5 grid gap-2">{listDemoAccounts().map((a) => <Button key={a.id} size="sm" variant={a.id === sid ? 'secondary' : 'outline'} onClick={() => signIn(a.id)} className="justify-start">{a.name} · {a.studentId}</Button>)}</div>
        <Button variant="danger" size="sm" onClick={() => { resetStore(); setOpen(false); }}>Reset all mock data</Button>
      </Modal>
    </>
  );
}

import { useState } from 'react';
import { Wrench, ShieldCheck, ShieldX } from 'lucide-react';
import { Modal, Button } from '../ui';
import { setDemoNow, resetStore, getState } from '../../services/store';
import { listDemoOfficers } from '../../services/authService';
import { getStudentDetail } from '../../services/studentService';
import { getEvent } from '../../services/eventService';
import { useAuth } from '../../hooks/useAuth';
import { useNow } from '../../hooks/useStore';
import { fmtInstant } from '../../utils/dates';
import { appConfig } from '../../config/appConfig';

const presets = [
  { label: 'Wed 4 Nov, 10:00 AM – window open', iso: '2026-11-04T10:00:00+05:30' },
  { label: 'Fri 6 Nov, 5:30 PM – closes soon', iso: '2026-11-06T17:30:00+05:30' },
  { label: 'Fri 6 Nov, 6:01 PM – week locked', iso: '2026-11-06T18:01:00+05:30' },
];

/** DEVELOPER-ONLY (not a production zone switcher). Hidden when appConfig.demo.showDevTools is false. */
export default function DevTools() {
  const [open, setOpen] = useState(false);
  const { oid, signIn } = useAuth();
  const t = useNow(1000);
  if (!appConfig.demo.showDevTools) return null;
  const other = getState().students.find((s) => s.zoneId !== getState().officers.find((o) => o.id === oid)?.zoneId);
  const otherEvent = getState().events.find((e) => e.zoneId === other?.zoneId);
  const blocked = other && getStudentDetail(oid, other.id) === null && getEvent(oid, otherEvent.id) === null;
  return (
    <>
      <button onClick={() => setOpen(true)} className="no-print fixed bottom-4 right-4 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-navy text-white shadow-pop" aria-label="Open developer tools (demo only)"><Wrench className="h-5 w-5" /></button>
      <Modal open={open} onOpenChange={setOpen} title="Developer tools (demo only)" description="Not part of the production portal. There is no zone switcher for real officers.">
        <p className="mb-2 text-sm font-semibold text-navy">Switch demo officer</p>
        <div className="mb-4 grid gap-2">{listDemoOfficers().map((o) => <Button key={o.id} size="sm" variant={o.id === oid ? 'secondary' : 'outline'} className="justify-start" onClick={() => signIn(o.id)}>{o.name} · {o.zone}</Button>)}</div>
        <p className="mb-2 text-sm font-semibold text-navy">Zone isolation self-check</p>
        <p className={`mb-4 flex items-start gap-2 rounded-xl border p-3 text-sm ${blocked ? 'border-emerald-200 bg-emerald-50 text-emerald-900' : 'border-rose-200 bg-rose-50 text-rose-900'}`}>{blocked ? <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" /> : <ShieldX className="mt-0.5 h-5 w-5 shrink-0" />}Requesting another zone’s student and event by ID returns “not found” for this officer.</p>
        <p className="mb-2 text-sm font-semibold text-navy">Demo clock (IST): <span className="font-normal">{fmtInstant(t)}</span></p>
        <div className="mb-4 grid gap-2">{presets.map((p) => <Button key={p.iso} variant="outline" size="sm" className="justify-start" onClick={() => setDemoNow(p.iso)}>{p.label}</Button>)}</div>
        <Button variant="danger" size="sm" onClick={() => { resetStore(); setOpen(false); }}>Reset all mock data</Button>
      </Modal>
    </>
  );
}

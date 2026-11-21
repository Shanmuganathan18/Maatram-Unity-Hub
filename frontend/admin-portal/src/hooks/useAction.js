import { useState } from 'react';
import { toast } from 'sonner';
/** Runs a service call with loading + error toast. Success toast only after the service resolves (no fake success). */
export const useAction = () => {
  const [busy, setBusy] = useState(false);
  const run = async (fn, ok) => { setBusy(true); try { const r = await fn(); if (ok) toast.success(typeof ok === 'function' ? ok(r) : ok); return { ok: true, r }; } catch (e) { toast.error(e.message); return { ok: false }; } finally { setBusy(false); } };
  return [run, busy];
};

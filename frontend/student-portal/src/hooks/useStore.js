import { useSyncExternalStore, useEffect, useState } from 'react';
import { subscribe, getVersion, syncBackendData } from '../services/store';
import { now } from '../services/clock';

let studentSyncDone = false;

/** Re-renders when store data changes and syncs with backend once on mount. */
export const useStore = () => {
  useEffect(() => {
    if (!studentSyncDone) {
      studentSyncDone = true;
      syncBackendData().catch(() => {});
    }
  }, []);
  return useSyncExternalStore(subscribe, getVersion, getVersion);
};

/** Current (demo-clock) time in ms, refreshed every `interval` ms. */
export const useNow = (interval = 1000) => {
  const [t, setT] = useState(now());
  useEffect(() => { setT(now()); const id = setInterval(() => setT(now()), interval); return () => clearInterval(id); }, [interval]);
  useStore();
  return t;
};

export const useOnline = () => {
  const [on, setOn] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);
  useEffect(() => {
    const u = () => setOn(true), d = () => setOn(false);
    window.addEventListener('online', u); window.addEventListener('offline', d);
    return () => { window.removeEventListener('online', u); window.removeEventListener('offline', d); };
  }, []);
  return on;
};

export const usePageTitle = (t) => useEffect(() => { document.title = `${t} · Maatram Student Portal`; }, [t]);

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { emptyDays, getRecord } from '../services/availabilityService';
import { weekDays } from '../utils/dates';

/** Local working copy of a week's availability (unsaved edits) + one-step undo. */
export function useWeekEditor(sid, ws, version) {
  const saved = useMemo(() => getRecord(sid, ws)?.days ?? emptyDays(ws), [sid, ws, version]); // eslint-disable-line
  const [days, setDays] = useState(() => structuredClone(saved));
  const [undo, setUndo] = useState(null);
  const baseline = useRef(JSON.stringify(saved));

  useEffect(() => { setDays(structuredClone(saved)); baseline.current = JSON.stringify(saved); setUndo(null); }, [sid, ws]); // eslint-disable-line
  // After a save/submit the record changes: re-sync baseline only (working copy equals what was saved).
  useEffect(() => { baseline.current = JSON.stringify(saved); setUndo(null); }, [saved]);

  const dirty = JSON.stringify(days) !== baseline.current;
  const hasSelection = Object.values(days).some((d) => d.status !== 'none');
  const change = useCallback((fn) => setDays((cur) => { setUndo(structuredClone(cur)); const next = structuredClone(cur); fn(next); return next; }), []);

  return {
    days, dirty, hasSelection, canUndo: !!undo,
    setStatus: (date, status) => change((d) => { d[date] = { status: d[date].status === status ? 'none' : status, slots: [] }; }),
    toggleSlot: (date, slot) => change((d) => { const s = d[date].slots; d[date].slots = s.includes(slot) ? s.filter((x) => x !== slot) : [...s, slot]; }),
    replaceAll: (nextDays) => change((d) => { Object.keys(d).forEach((k) => delete d[k]); Object.assign(d, nextDays); }),
    markAllUnavailable: () => change((d) => { weekDays(ws).forEach((k) => { d[k] = { status: 'unavailable', slots: [] }; }); }),
    reset: () => { setDays(structuredClone(saved)); setUndo(null); },
    undoLast: () => { if (undo) { setDays(undo); setUndo(null); } },
  };
}

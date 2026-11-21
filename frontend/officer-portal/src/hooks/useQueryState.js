import { useSearchParams } from 'react-router-dom';
/** Filter/sort/page state kept in the URL so views are shareable and the back button works. */
export const useQueryState = (defaults) => {
  const [params, setParams] = useSearchParams();
  const state = Object.fromEntries(Object.keys(defaults).map((k) => [k, params.get(k) ?? defaults[k]]));
  const set = (patch) => { const next = new URLSearchParams(params); Object.entries(patch).forEach(([k, v]) => { (v === '' || v == null || String(v) === String(defaults[k])) ? next.delete(k) : next.set(k, v); }); if (!('page' in patch)) next.delete('page'); setParams(next, { replace: true }); };
  const clear = () => setParams({}, { replace: true });
  const active = Object.keys(defaults).some((k) => !['sort', 'dir', 'page'].includes(k) && state[k] !== String(defaults[k]));
  return [state, set, clear, active];
};

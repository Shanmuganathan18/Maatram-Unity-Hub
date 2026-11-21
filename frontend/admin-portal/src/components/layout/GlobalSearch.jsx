import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { globalSearch } from '../../services/searchService';
import { useAuth } from '../../context/AuthContext';
import { useStore } from '../../hooks/useStore';

/** Searches only categories the admin may view. */
export default function GlobalSearch() {
  const { aid } = useAuth(); useStore(); const [q, setQ] = useState(''); const [open, setOpen] = useState(false); const ref = useRef(null);
  useEffect(() => { const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }; document.addEventListener('mousedown', h); return () => document.removeEventListener('mousedown', h); }, []);
  const res = globalSearch(aid, q);
  return (
    <div ref={ref} className="relative hidden max-w-sm flex-1 lg:block" role="search">
      <label htmlFor="gs" className="sr-only">Global search</label><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-ink-mute" />
      <input id="gs" className="field min-h-[40px] pl-9" placeholder="Search zones, officers, students, events…" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)} autoComplete="off" />
      {open && q.trim().length >= 2 && (
        <div className="absolute left-0 right-0 top-12 z-40 max-h-96 overflow-y-auto rounded-2xl border border-lavender-200 bg-white p-2 shadow-pop">
          {res.length === 0 ? <p className="p-3 text-sm text-ink-soft">No results in the areas you can access.</p> : res.map((g) => (
            <div key={g.type} className="mb-2"><p className="px-2 py-1 text-xs font-bold uppercase text-ink-mute">{g.label}</p>
              {g.items.map((i) => <Link key={i.id} to={i.to} onClick={() => { setOpen(false); setQ(''); }} className="block rounded-lg px-2 py-1.5 text-sm hover:bg-lavender-100"><span className="font-semibold text-navy">{i.title}</span><span className="block text-xs text-ink-mute">{i.sub}</span></Link>)}</div>))}
        </div>)}
    </div>
  );
}

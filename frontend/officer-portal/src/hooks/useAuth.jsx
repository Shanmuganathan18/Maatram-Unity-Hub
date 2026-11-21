// PROTOTYPE auth. The session stores only the officer id; the zone is ALWAYS derived from the officer account
// inside services (never from client state). Real app: Supabase session -> backend verifies token -> zone.
import { createContext, useContext, useState, useCallback } from 'react';
import { getOfficerProfile } from '../services/authService';
import { useStore } from './useStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const Ctx = createContext(null);
const KEY = 'maatram-officer-session';

export function AuthProvider({ children }) {
  const [oid, setOid] = useState(() => { try { return sessionStorage.getItem(KEY); } catch { return null; } });
  const signIn = useCallback((id, profile = null) => {
    try {
      sessionStorage.setItem(KEY, id);
      if (profile) {
        sessionStorage.setItem('maatram_officer_profile', JSON.stringify(profile));
      }
    } catch { /* ignore */ }
    setOid(id);
  }, []);
  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem('maatram_officer_profile');
      api.setToken(null);
      supabase.auth.signOut().catch(() => {});
    } catch { /* ignore */ }
    setOid(null);
  }, []);
  useStore();
  const officer = oid ? getOfficerProfile(oid) : null;
  return <Ctx.Provider value={{ oid: officer ? oid : null, officer, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

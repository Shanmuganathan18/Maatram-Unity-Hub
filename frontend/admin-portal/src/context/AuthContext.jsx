// PROTOTYPE auth. Session stores only the admin id; role/permissions are ALWAYS re-read from the (mock) backend store,
// never trusted from local storage. Real app: Supabase session -> backend verifies token -> role + permissions.
import { createContext, useCallback, useContext, useState } from 'react';
import { getAdminProfile, logoutAudit } from '../services/authService';
import { useStore } from '../hooks/useStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const Ctx = createContext(null);
const KEY = 'maatram-admin-session';

export function AuthProvider({ children }) {
  const [aid, setAid] = useState(() => { try { return sessionStorage.getItem(KEY); } catch { return null; } });
  const signIn = useCallback((id, profile = null) => {
    try {
      sessionStorage.setItem(KEY, id);
      if (profile) {
        sessionStorage.setItem('maatram_admin_profile', JSON.stringify(profile));
      }
    } catch { /* ignore */ }
    setAid(id);
  }, []);
  const signOut = useCallback(() => {
    if (aid) logoutAudit(aid);
    try {
      sessionStorage.removeItem(KEY);
      sessionStorage.removeItem('maatram_admin_profile');
      api.setToken(null);
      supabase.auth.signOut().catch(() => {});
    } catch { /* ignore */ }
    setAid(null);
  }, [aid]);
  useStore();
  const admin = aid ? getAdminProfile(aid) : null;
  const active = admin && admin.status === 'Active';
  return <Ctx.Provider value={{ aid: active ? aid : null, admin: active ? admin : null, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

// Authentication context for Officer Portal
import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getOfficerProfile } from '../services/authService';
import { useStore } from './useStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const Ctx = createContext(null);
const KEY = 'maatram-officer-session';

export function AuthProvider({ children }) {
  const [oid, setOid] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) || localStorage.getItem(KEY) || null;
    } catch {
      return null;
    }
  });

  const signIn = useCallback((id, profile = null) => {
    try {
      sessionStorage.setItem(KEY, id);
      localStorage.setItem(KEY, id);
      if (profile) {
        sessionStorage.setItem('maatram_officer_profile', JSON.stringify(profile));
        localStorage.setItem('maatram_officer_profile', JSON.stringify(profile));
      }
    } catch {
      // ignore
    }
    setOid(id);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      sessionStorage.removeItem('maatram_officer_profile');
      localStorage.removeItem('maatram_officer_profile');
      api.setToken(null);
      supabase.auth.signOut().catch(() => {});
    } catch {
      // ignore
    }
    setOid(null);
  }, []);

  useStore();

  const officer = useMemo(() => {
    if (!oid) return null;
    return getOfficerProfile(oid);
  }, [oid]);

  const activeOid = oid || officer?.id || null;

  return (
    <Ctx.Provider value={{ oid: activeOid, officer, signIn, signOut }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);

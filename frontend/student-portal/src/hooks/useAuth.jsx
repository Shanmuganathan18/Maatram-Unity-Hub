// PROTOTYPE auth only. Real sign-in will use Supabase Auth (email/password + Google) later.
import { createContext, useContext, useState, useCallback } from 'react';
import { getProfile } from '../services/profileService';
import { useStore } from './useStore';
import { supabase } from '../services/supabase';
import { api } from '../services/api';

const Ctx = createContext(null);
const KEY = 'maatram-demo-student'; // stores student id / session id for the browser session

export function AuthProvider({ children }) {
  const [sid, setSid] = useState(() => {
    try {
      return sessionStorage.getItem(KEY) || localStorage.getItem(KEY);
    } catch {
      return null;
    }
  });

  const signIn = useCallback((id, profile = null) => {
    try {
      sessionStorage.setItem(KEY, id);
      localStorage.setItem(KEY, id);
      if (profile) {
        sessionStorage.setItem('maatram_student_profile', JSON.stringify(profile));
        localStorage.setItem('maatram_student_profile', JSON.stringify(profile));
      }
    } catch { /* ignore */ }
    setSid(id);
  }, []);

  const signOut = useCallback(() => {
    try {
      sessionStorage.removeItem(KEY);
      localStorage.removeItem(KEY);
      sessionStorage.removeItem('maatram_student_profile');
      localStorage.removeItem('maatram_student_profile');
      sessionStorage.removeItem('maatram_student_pending_token');
      sessionStorage.removeItem('maatram_student_pending_user');
      api.setToken(null);
      supabase.auth.signOut().catch(() => {});
    } catch { /* ignore */ }
    setSid(null);
  }, []);
  useStore();
  const student = sid ? getProfile(sid) : null;
  return <Ctx.Provider value={{ sid: student ? sid : null, student, signIn, signOut }}>{children}</Ctx.Provider>;
}
export const useAuth = () => useContext(Ctx);

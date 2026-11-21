import { createContext, useContext, useMemo } from 'react';
import { useAuth } from './AuthContext';
import { permissionsOf } from '../services/accessService';
import { useStore } from '../hooks/useStore';

const Ctx = createContext({ can: () => false, permissions: new Set() });
/** UI convenience only – the services (and later the backend) enforce every permission again. */
export function PermissionProvider({ children }) {
  const { aid } = useAuth(); const v = useStore();
  const value = useMemo(() => { const permissions = aid ? permissionsOf(aid) : new Set(); return { permissions, can: (k) => permissions.has(k), canAny: (...ks) => ks.some((k) => permissions.has(k)) }; }, [aid, v]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
export const usePermissions = () => useContext(Ctx);

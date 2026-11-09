import React, { createContext, useContext, useEffect, useState } from 'react';
import { AuthResult, loadToken, setToken, setUnauthorizedHandler } from './api';

type Ctx = { user: AuthResult['user'] | null; ready: boolean; signIn: (r: AuthResult) => Promise<void>; signOut: () => Promise<void> };
const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<Ctx['user']>(null);
  const [ready, setReady] = useState(false);

  const signOut = async () => { await setToken(null); setUser(null); };
  const signIn = async (r: AuthResult) => { await setToken(r.token); setUser(r.user); };

  useEffect(() => {
    setUnauthorizedHandler(() => { signOut(); });
    (async () => {
      const t = await loadToken();
      if (t) {
        // El payload del JWT lleva id/username/country; lo leemos sin verificar (el servidor valida en cada llamada).
        try {
          const p = JSON.parse(atob(t.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
          if (p.exp * 1000 > Date.now()) setUser({ id: p.id, username: p.username, country: p.country });
        } catch { /* token ilegible: pedimos login */ }
      }
      setReady(true);
    })();
  }, []);

  return <AuthCtx.Provider value={{ user, ready, signIn, signOut }}>{children}</AuthCtx.Provider>;
}

import { createContext, useContext, useEffect, useState } from 'react';
import { PLINTH } from '../config';
import { request, setPlatformCsrf } from './api';
import { applyTheme } from './theme';
import { setTeacherAuth } from '../services/session';
const Context = createContext(null);
const entries = new Map();
function enter(token) {
  if (!entries.has(token))
    entries.set(
      token,
      request('/api/site/entry', { method: 'POST', body: { token } }),
    );
  return entries.get(token);
}
export function PlatformProvider({ children }) {
  const [tenant, setTenant] = useState(PLINTH.tenant),
    [user, setUser] = useState(null),
    [ready, setReady] = useState(!PLINTH.tenant),
    [error, setError] = useState('');
  const refresh = async () => {
    if (!PLINTH.tenant) return;
    setError('');
    try {
      const q = await request('/api/site/session');
      setUser(q.user);
      setTenant(q.tenant);
      setPlatformCsrf(q.csrfToken);
      return q;
    } catch (e) {
      setError(e.message);
    } finally {
      setReady(true);
    }
  };
  useEffect(() => {
    if (!PLINTH.enabled) return;
    const entry = new URLSearchParams(location.search).get('entry');
    let cancelled = false;
    const load = async () => {
      if (entry && PLINTH.tenant) {
        try {
          const r = await enter(entry);
          if (cancelled) return;
          setUser(r.user);
          setPlatformCsrf(r.csrfToken);
          if (r.instituteCsrf)
            setTeacherAuth({
              teacher: {
                id: r.user.teacherId,
                name: r.user.name,
                email: r.user.email,
                role: r.user.role === 'admin' ? 'admin' : 'teacher',
              },
              csrfToken: r.instituteCsrf,
            });
          history.replaceState(null, '', location.pathname);
        } catch (e) {
          setError(e.message);
        }
      }
      await refresh();
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);
  useEffect(() => {
    if (!PLINTH.tenant) return;
    const change = () => refresh();
    window.addEventListener('account-auth-change', change);
    return () => window.removeEventListener('account-auth-change', change);
  }, []);
  useEffect(() => {
    if (!PLINTH.enabled) return;
    applyTheme(tenant);
    const observer = new MutationObserver(() => applyTheme(tenant));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, [tenant]);
  const signIn = async (values) => {
    const r = await request('/api/site/login', {
      method: 'POST',
      body: values,
    });
    setUser(r.user);
    setPlatformCsrf(r.csrfToken);
    if (r.instituteCsrf)
      setTeacherAuth({
        teacher: {
          id: r.user.teacherId,
          name: r.user.name,
          email: r.user.email,
          role: r.user.role === 'admin' ? 'admin' : 'teacher',
        },
        csrfToken: r.instituteCsrf,
      });
    return r;
  };
  const signOut = async () => {
    await request('/api/site/logout', { method: 'POST', body: {} });
    setUser(null);
    setPlatformCsrf(null);
  };
  return (
    <Context.Provider
      value={{
        tenant,
        user,
        ready,
        error,
        setTenant,
        refresh,
        signIn,
        signOut,
      }}
    >
      {children}
    </Context.Provider>
  );
}
export function usePlatform() {
  return (
    useContext(Context) || { tenant: PLINTH.tenant, user: null, ready: true }
  );
}

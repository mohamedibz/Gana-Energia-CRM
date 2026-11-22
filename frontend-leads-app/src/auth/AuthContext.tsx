import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, session } from '../api';
import type { Agent } from '../api/types';
import { toast } from '../toast';

type Status = 'loading' | 'anonymous' | 'authenticated';

export interface AuthValue {
  status: Status;
  agent: Agent | null;
  agents: Agent[];
  login: (telefono: string, password: string) => Promise<void>;
  logout: () => void;
  agentName: (id: string | null) => string;
}

export const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return value;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [agent, setAgent] = useState<Agent | null>(null);
  const [agents, setAgents] = useState<Agent[]>([]);

  const logout = useCallback(() => {
    session.clear();
    setAgent(null);
    setAgents([]);
    setStatus('anonymous');
  }, []);

  // Si el servidor responde 401 en cualquier petición, se cierra la sesión y se avisa
  useEffect(
    () =>
      session.onUnauthorized(() => {
        logout();
        toast.warning('Tu sesión ha caducado. Vuelve a iniciar sesión.');
      }),
    [logout],
  );

  // Al abrir la app, si hay un token guardado se comprueba que sigue siendo válido
  useEffect(() => {
    if (!session.getToken()) {
      setStatus('anonymous');
      return;
    }
    let cancelled = false;
    Promise.all([api.me(), api.agents()])
      .then(([me, list]) => {
        if (cancelled) return;
        setAgent(me);
        setAgents(list);
        setStatus('authenticated');
      })
      .catch(() => !cancelled && logout());
    return () => {
      cancelled = true;
    };
  }, [logout]);

  const login = useCallback(async (telefono: string, password: string) => {
    const { token, agente } = await api.login(telefono, password);
    session.setToken(token);
    try {
      setAgents(await api.agents());
    } catch (error) {
      session.clear();
      throw error;
    }
    setAgent(agente);
    setStatus('authenticated');
  }, []);

  const value = useMemo<AuthValue>(
    () => ({
      status,
      agent,
      agents,
      login,
      logout,
      agentName: (id) => (id === null ? 'Sin asignar' : (agents.find((a) => a.id === id)?.nombre ?? `Agente ${id}`)),
    }),
    [status, agent, agents, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { AuthUser } from './types';
import axios from 'axios';

const BASE = import.meta.env.VITE_API_URL ?? '/api';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    token: null,
    isLoading: true,
  });

  // Restore session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('scch_token');
    if (stored) {
      axios
        .get<AuthUser>(`${BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${stored}` },
        })
        .then(res => {
          setState({ user: res.data, token: stored, isLoading: false });
        })
        .catch(() => {
          localStorage.removeItem('scch_token');
          setState({ user: null, token: null, isLoading: false });
        });
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const _applyToken = useCallback((token: string, user: AuthUser) => {
    localStorage.setItem('scch_token', token);
    setState({ user, token, isLoading: false });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await axios.post<{ token: string; user: AuthUser }>(
      `${BASE}/auth/login`,
      { email, password },
    );
    _applyToken(res.data.token, res.data.user);
  }, [_applyToken]);

  const loginDemo = useCallback(async () => {
    const res = await axios.post<{ token: string; user: AuthUser }>(`${BASE}/auth/demo`);
    _applyToken(res.data.token, res.data.user);
  }, [_applyToken]);

  const logout = useCallback(() => {
    localStorage.removeItem('scch_token');
    setState({ user: null, token: null, isLoading: false });
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, loginDemo, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}

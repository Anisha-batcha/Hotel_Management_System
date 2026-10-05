import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api from '../lib/api';
import type { AuthResponse, User } from '../types';

const TOKEN_KEY = 'hm_token';
const USER_KEY = 'hm_user';

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { full_name: string; email: string; password: string; phone?: string }) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem(TOKEN_KEY);
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedToken) setToken(savedToken);
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem(USER_KEY);
      }
    }
  }, []);

  const persistSession = (session: AuthResponse) => {
    setToken(session.token);
    setUser(session.user);
    localStorage.setItem(TOKEN_KEY, session.token);
    localStorage.setItem(USER_KEY, JSON.stringify(session.user));
  };

  const login = async (payload: { email: string; password: string }) => {
    const { data } = await api.post<AuthResponse>('/auth/login', payload);
    persistSession(data);
  };

  const register = async (payload: { full_name: string; email: string; password: string; phone?: string }) => {
    const { data } = await api.post<AuthResponse>('/auth/register', payload);
    persistSession(data);
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isLoggedIn: Boolean(user),
      isAdmin: user?.role === 'admin',
      login,
      register,
      logout
    }),
    [user, token]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}

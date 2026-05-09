import React, { createContext, useContext, useEffect, useState } from 'react';

type User = { id: string; email: string; name?: string; avatar?: string; role?: string; isPremium?: boolean; premiumExpiresAt?: string } | null;

type AuthContextType = {
  user: User;
  loading: boolean;
  login: (token: string) => void;
  logout: () => void;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User>(null);
  const [loading, setLoading] = useState(true);

  const fetchMe = async () => {
    const token = localStorage.getItem('token');
    console.log('[AuthContext] fetchMe called, token:', token ? `${token.substring(0, 20)}...` : 'null');
    if (!token) {
      console.log('[AuthContext] No token found, setting user to null');
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('[AuthContext] Fetching /api/me from:', apiBase);
      const res = await fetch(`${apiBase}/api/me`, { headers: { Authorization: `Bearer ${token}` } });
      console.log('[AuthContext] /api/me response status:', res.status);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      console.log('[AuthContext] User fetched:', data);
      setUser({ id: data.id, email: data.email, name: data.name, avatar: data.avatar, role: data.role, isPremium: data.isPremium, premiumExpiresAt: data.premiumExpiresAt });
    } catch (err) {
      console.error('[AuthContext] Error fetching user:', err);
      localStorage.removeItem('token');
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMe();
  }, []);

  const login = (token: string) => {
    console.log('[AuthContext] login called with token:', token ? `${token.substring(0, 20)}...` : 'null');
    localStorage.setItem('token', token);
    console.log('[AuthContext] Token stored in localStorage');
    fetchMe();
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };

  const refresh = async () => fetchMe();

  return <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export default AuthContext;

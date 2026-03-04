'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  planTier: 'free' | 'pro' | 'enterprise';
  avatarInitials: string;
}

interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  login: (email: string, name: string) => void;
  logout: () => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY = 'inferra_user';

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Rehydrate session from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) setUser(JSON.parse(stored));
    } catch {
      // corrupted storage — ignore
    }
    setIsLoading(false);
  }, []);

  function login(email: string, name: string) {
    const displayName = name.trim() || email.split('@')[0];
    const initials = displayName.slice(0, 2).toUpperCase();

    const newUser: AuthUser = {
      id: crypto.randomUUID(),
      email,
      name: displayName,
      planTier: 'free',
      avatarInitials: initials,
    };

    setUser(newUser);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newUser));
    router.push('/Dashboard');
  }

  function logout() {
    setUser(null);
    localStorage.removeItem(STORAGE_KEY);
    router.push('/');
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

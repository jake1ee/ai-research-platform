import { useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { BlinkUser } from '@blinkdotnew/sdk';

export function useAuth() {
  const [user, setUser] = useState<BlinkUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = blink.auth.onAuthStateChanged((state) => {
      setUser(state.user);
      setIsLoading(state.isLoading);
    });
    return unsubscribe;
  }, []);

  const login = () => blink.auth.login(window.location.href);
  const logout = () => blink.auth.signOut();

  return { user, isLoading, isAuthenticated: !!user, login, logout };
}

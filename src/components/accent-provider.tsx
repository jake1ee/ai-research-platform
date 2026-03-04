import React, { createContext, useContext, useEffect, useState } from 'react';
import { blink } from '@/lib/blink';
import { useAuth } from '@/hooks/use-auth';

type AccentColor = 'blue' | 'purple' | 'rose' | 'amber' | 'emerald';

interface AccentContextType {
  accent: AccentColor;
  setAccent: (accent: AccentColor) => void;
}

const AccentContext = createContext<AccentContextType | undefined>(undefined);

export const AccentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [accent, setAccent] = useState<AccentColor>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('accent-color') as AccentColor) || 'purple';
    }
    return 'purple';
  });

  useEffect(() => {
    if (user?.id) {
      loadDBSettings();
    }
  }, [user?.id]);

  const loadDBSettings = async () => {
    try {
      const settings = await blink.db.table('user_settings').get(user!.id);
      if (settings?.accent) {
        setAccent(settings.accent as AccentColor);
      }
    } catch (error) {
      console.error('Failed to load accent from DB:', error);
    }
  };

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove all accent classes
    root.classList.remove('accent-blue', 'accent-purple', 'accent-rose', 'accent-amber', 'accent-emerald');
    
    // Add new accent class
    root.classList.add(`accent-${accent}`);
    
    localStorage.setItem('accent-color', accent);
  }, [accent]);

  return (
    <AccentContext.Provider value={{ accent, setAccent }}>
      {children}
    </AccentContext.Provider>
  );
};

export const useAccent = () => {
  const context = useContext(AccentContext);
  if (!context) {
    throw new Error('useAccent must be used within an AccentProvider');
  }
  return context;
};
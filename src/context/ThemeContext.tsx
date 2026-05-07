import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('light');
  const { user, profile } = useAuth();

  useEffect(() => {
    // Check initial preference from Supabase or LocalStorage
    const fetchTheme = async () => {
      let savedTheme = localStorage.getItem('theme') as Theme | null;
      
      if (user && profile && (profile as any).theme) {
        savedTheme = (profile as any).theme;
      }

      if (savedTheme) {
        setTheme(savedTheme);
      } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
    };
    fetchTheme();
  }, [user, profile]);

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem('theme', theme);

    if (user) {
      supabase.from('profiles').update({ theme }).eq('id', user.id).then(({ error }) => {
        if (error) console.error('Error saving theme:', error);
      });
    }
  }, [theme, user]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
};

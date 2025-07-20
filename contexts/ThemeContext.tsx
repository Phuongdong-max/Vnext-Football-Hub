
import React, { useState, useEffect, createContext, useContext } from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  appliedTheme: 'light' | 'dark';
}

export const ThemeContext = createContext<ThemeContextType | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    const storedTheme = localStorage.getItem('theme') as Theme | null;
    return storedTheme || 'system';
  });
  const [appliedTheme, setAppliedTheme] = useState<'light' | 'dark'>('light');

  useEffect(() => {
    const root = window.document.documentElement;
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)');

    const applyCurrentTheme = () => {
      let currentAppliedTheme: 'light' | 'dark';
      if (theme === 'system') {
        currentAppliedTheme = systemPrefersDark.matches ? 'dark' : 'light';
      } else {
        currentAppliedTheme = theme;
      }
      
      root.classList.remove(currentAppliedTheme === 'dark' ? 'light' : 'dark');
      root.classList.add(currentAppliedTheme);
      setAppliedTheme(currentAppliedTheme);
    };

    applyCurrentTheme();
    localStorage.setItem('theme', theme);

    const handleChange = () => applyCurrentTheme();
    systemPrefersDark.addEventListener('change', handleChange);
    return () => {
      systemPrefersDark.removeEventListener('change', handleChange);
    };
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, appliedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

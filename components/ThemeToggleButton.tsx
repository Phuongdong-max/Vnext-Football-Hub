
import React, { useState } from 'react';
import { useTheme } from '../App'; // Assuming ThemeContext is exported from App.tsx
import { SunIcon, MoonIcon, DesktopComputerIcon } from './icons';
import { Button } from './shared/Button';

export const ThemeToggleButton: React.FC = () => {
  const { theme, setTheme, appliedTheme } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const themeOptions = [
    { name: 'Light', value: 'light', icon: <SunIcon className="w-5 h-5 mr-2" /> },
    { name: 'Dark', value: 'dark', icon: <MoonIcon className="w-5 h-5 mr-2" /> },
    { name: 'System', value: 'system', icon: <DesktopComputerIcon className="w-5 h-5 mr-2" /> },
  ];

  const currentIcon = () => {
    if (theme === 'light') return <SunIcon className="w-5 h-5" />;
    if (theme === 'dark') return <MoonIcon className="w-5 h-5" />;
    // If system, show icon based on applied theme
    if (appliedTheme === 'dark') return <MoonIcon className="w-5 h-5" />;
    return <SunIcon className="w-5 h-5" />;
  };
  
  const handleSetTheme = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        variant="outline"
        size="sm"
        className="border-gray-300 dark:border-slate-600 text-textPrimary dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700"
        aria-label={`Current theme: ${theme}. Theme applied: ${appliedTheme}. Change theme.`}
      >
        {currentIcon()}
      </Button>
      {isMenuOpen && (
        <div 
            className="absolute right-0 mt-2 w-40 bg-surface rounded-md shadow-lg py-1 z-50 border border-border"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="theme-options-menu"
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetTheme(option.value as 'light' | 'dark' | 'system')}
              className={`w-full text-left px-4 py-2 text-sm flex items-center
                          ${theme === option.value 
                            ? 'bg-primary/20 text-primary' 
                            : 'text-textPrimary hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700'}`}
              role="menuitem"
            >
              {option.icon}
              {option.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

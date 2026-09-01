import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext'; // Assuming ThemeContext is exported from App.tsx
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
        className="w-10 px-0"
        aria-label={`Current theme: ${theme}. Theme applied: ${appliedTheme}. Change theme.`}
      >
        {currentIcon()}
      </Button>
      {isMenuOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-popover text-popover-foreground shadow-orange-lg py-1 z-[60] animate-scale-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="theme-options-menu"
        >
          {themeOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetTheme(option.value as 'light' | 'dark' | 'system')}
              className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors duration-150 ease-spring
                          ${
                            theme === option.value
                              ? 'bg-primary/10 text-vnext-deep dark:text-primary font-semibold'
                              : 'text-foreground hover:bg-muted/60'
                          }`}
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

import React, { useState } from 'react';
import { useLanguage, SupportedLanguage } from '../contexts/LanguageContext';
import { Button } from './shared/Button';
// No specific icons for EN/VI, will use text. Globe icon could be an option.
// For simplicity, using text labels like "EN", "VI" on the button.

export const LanguageToggleButton: React.FC = () => {
  const { language, setLanguage, translate } = useLanguage();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const languageOptions: { nameKey: string; value: SupportedLanguage; display: string }[] = [
    { nameKey: 'lang.english', value: 'en', display: 'EN' },
    { nameKey: 'lang.vietnamese', value: 'vi', display: 'VI' },
  ];

  const currentLanguageDisplay =
    languageOptions.find((opt) => opt.value === language)?.display || language.toUpperCase();

  const handleSetLanguage = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setIsMenuOpen(false);
  };

  return (
    <div className="relative">
      <Button
        onClick={() => setIsMenuOpen(!isMenuOpen)}
        variant="outline"
        size="sm"
        className="w-12 px-0 font-semibold"
        aria-label={`Current language: ${language}. Change language.`}
        title={translate(language === 'en' ? 'lang.english' : 'lang.vietnamese')}
      >
        {currentLanguageDisplay}
      </Button>
      {isMenuOpen && (
        <div
          className="absolute right-0 mt-2 w-44 rounded-lg border border-border bg-popover text-popover-foreground shadow-orange-lg py-1 z-[60] animate-scale-in"
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="language-options-menu"
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetLanguage(option.value)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center transition-colors duration-150 ease-spring
                          ${
                            language === option.value
                              ? 'bg-primary/10 text-vnext-deep dark:text-primary font-semibold'
                              : 'text-foreground hover:bg-muted/60'
                          }`}
              role="menuitem"
            >
              {/* Option to add small flag icons here later if desired */}
              {translate(option.nameKey)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

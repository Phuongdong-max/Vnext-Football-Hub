

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

  const currentLanguageDisplay = languageOptions.find(opt => opt.value === language)?.display || language.toUpperCase();

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
        className="border-gray-300 dark:border-slate-600 text-textPrimary dark:text-slate-200 hover:bg-gray-100 dark:hover:bg-slate-700 w-12" // Fixed width for EN/VI
        aria-label={`Current language: ${language}. Change language.`}
        title={translate(language === 'en' ? 'lang.english' : 'lang.vietnamese')}
      >
        {currentLanguageDisplay}
      </Button>
      {isMenuOpen && (
        <div 
            className="absolute right-0 mt-2 w-40 bg-surface rounded-md shadow-lg py-1 z-50 border border-border"
            role="menu"
            aria-orientation="vertical"
            aria-labelledby="language-options-menu"
        >
          {languageOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => handleSetLanguage(option.value)}
              className={`w-full text-left px-4 py-2 text-sm flex items-center
                          ${language === option.value 
                            ? 'bg-primary/20 text-primary font-semibold' 
                            : 'text-textPrimary hover:bg-gray-100 dark:text-slate-200 dark:hover:bg-slate-700'}`}
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

import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';
import enTranslations from '../locales/en.json';
import viTranslations from '../locales/vi.json';

export type SupportedLanguage = 'en' | 'vi';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  translate: (key: string, replacements?: Record<string, string | number>) => string;
  translationsLoading: boolean;
}

export const LanguageContext = createContext<LanguageContextType | null>(null);

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    const storedLang = localStorage.getItem('language') as SupportedLanguage | null;
    if (storedLang && ['en', 'vi'].includes(storedLang)) {
      return storedLang;
    }
    const browserLang = navigator.language.split('-')[0];
    if (browserLang === 'vi') return 'vi';
    return 'en';
  });
  const [translations, setTranslations] = useState<Record<string, any>>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    console.log(`[LanguageContext] Loading translations for language: ${language}`);
    setTranslationsLoading(true);
    const translationsToLoad = language === 'vi' ? viTranslations : enTranslations;
    
    if (translationsToLoad && typeof translationsToLoad === 'object' && Object.keys(translationsToLoad).length > 0) {
        setTranslations(translationsToLoad);
        console.log(`[LanguageContext] Successfully loaded ${Object.keys(translationsToLoad).length} translation keys.`);
    } else {
        console.error(`[LanguageContext] Failed to load translations for ${language}. The imported JSON might be empty or invalid.`);
        setTranslations({});
    }
    
    document.documentElement.lang = language;
    setTranslationsLoading(false);
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const translate = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translatedString = translations[key];
    
    if (translatedString === undefined) {
      console.warn(`[LanguageContext] Translation key not found: "${key}"`);
      return key;
    }
    
    if (replacements) {
      Object.keys(replacements).forEach(placeholder => {
        translatedString = translatedString.replace(new RegExp(`{{${placeholder}}}`, 'g'), String(replacements[placeholder]));
      });
    }
    return translatedString;
  }, [translations]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, translate, translationsLoading }}>
      {children}
    </LanguageContext.Provider>
  );
};
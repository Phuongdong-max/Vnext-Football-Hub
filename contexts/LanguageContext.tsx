
import React, { useState, useEffect, createContext, useContext, useCallback } from 'react';

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
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translationsLoading, setTranslationsLoading] = useState(true);

  useEffect(() => {
    let active = true; // Prevent state updates if component unmounts
    setTranslationsLoading(true); 

    const loadTranslationsAsync = async () => {
      try {
        const response = await fetch(`/locales/${language}.json`);
        if (!response.ok) {
          console.error(`Failed to load translations for ${language}. Status: ${response.status}`);
          if (language !== 'en') {
            console.warn(`Attempting to load English translations as fallback.`);
            const fallbackResponse = await fetch(`/locales/en.json`);
            if (fallbackResponse.ok) {
              const fallbackData = await fallbackResponse.json();
              if (active) {
                setTranslations(fallbackData);
                document.documentElement.lang = 'en';
                console.warn(`Loaded English translations as fallback.`);
              }
            } else {
              console.error(`Failed to load fallback English translations. Status: ${fallbackResponse.status}`);
              if (active) {
                setTranslations({}); 
                document.documentElement.lang = 'en'; 
              }
            }
          } else { 
             if (active) {
                setTranslations({});
                document.documentElement.lang = 'en';
             }
          }
        } else { 
          const data = await response.json();
          if (active) {
            setTranslations(data);
            document.documentElement.lang = language;
          }
        }
      } catch (error) {
        console.error("Error loading translation file:", error);
        if (active) {
          setTranslations({});
          document.documentElement.lang = 'en';
        }
      } finally {
        if (active) {
          setTranslationsLoading(false);
        }
      }
    };

    loadTranslationsAsync();

    return () => {
      active = false; 
    };
  }, [language]);

  const setLanguage = (lang: SupportedLanguage) => {
    localStorage.setItem('language', lang);
    setLanguageState(lang);
  };

  const translate = useCallback((key: string, replacements?: Record<string, string | number>): string => {
    let translatedString = translations[key] || key; 
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

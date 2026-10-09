import React, { createContext, useContext, useState, useEffect } from 'react';
import { SupportedLanguage, SUPPORTED_LANGUAGES } from './types';
import { translations } from './translations';

interface LanguageContextType {
  language: SupportedLanguage;
  setLanguage: (lang: SupportedLanguage) => void;
  t: (key: string, fallback?: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const STORAGE_LANG_KEY = 'hr_tmis_language_v1';

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<SupportedLanguage>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_LANG_KEY) as SupportedLanguage;
      if (saved && (saved === 'en' || saved === 'om' || saved === 'am')) {
        return saved;
      }
      return 'en';
    } catch {
      return 'en';
    }
  });

  const setLanguage = (lang: SupportedLanguage) => {
    if (lang !== 'en' && lang !== 'om' && lang !== 'am') return;
    setLanguageState(lang);
    try {
      localStorage.setItem(STORAGE_LANG_KEY, lang);
      // Set Django standard language cookie for compatibility with Django i18n
      document.cookie = `django_language=${lang};path=/;max-age=31536000;SameSite=Lax`;
    } catch (e) {
      console.warn('Could not save language to storage', e);
    }
  };

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.setAttribute('lang', language);
    document.documentElement.setAttribute('dir', 'ltr');
  }, [language]);

  const t = (key: string, fallback?: string): string => {
    const langDict = translations[language];
    if (langDict && langDict[key]) {
      return langDict[key];
    }
    // Fallback to English
    if (translations.en && translations.en[key]) {
      return translations.en[key];
    }
    return fallback || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};

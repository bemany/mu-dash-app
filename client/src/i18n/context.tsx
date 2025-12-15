import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { translations, Language, languages, TranslationKeys } from './translations';

type NestedKeyOf<T> = T extends object
  ? { [K in keyof T]: K extends string
      ? T[K] extends object
        ? `${K}.${NestedKeyOf<T[K]>}` | K
        : K
      : never
    }[keyof T]
  : never;

type TranslationPath = NestedKeyOf<TranslationKeys>;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  dir: 'ltr' | 'rtl';
  languages: typeof languages;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const STORAGE_KEY = 'uber-retter-language';

function getNestedValue(obj: any, path: string): string {
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === undefined || current === null) {
      return path;
    }
    current = current[key];
  }
  
  return typeof current === 'string' ? current : path;
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored && ['de', 'en', 'tr', 'ar'].includes(stored)) {
        return stored as Language;
      }
    }
    return 'de';
  });

  const dir = languages.find(l => l.code === language)?.dir || 'ltr';

  useEffect(() => {
    document.documentElement.lang = language;
    document.documentElement.dir = dir;
    localStorage.setItem(STORAGE_KEY, language);
  }, [language, dir]);

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang);
  }, []);

  const t = useCallback((key: string, params?: Record<string, string | number>): string => {
    let value = getNestedValue(translations[language], key);
    
    if (value === key) {
      value = getNestedValue(translations.de, key);
    }
    
    if (params) {
      Object.entries(params).forEach(([paramKey, paramValue]) => {
        value = value.replace(`{${paramKey}}`, String(paramValue));
      });
    }
    
    return value;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, dir, languages }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
}

export function useLanguage() {
  return useTranslation();
}

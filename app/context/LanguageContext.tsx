import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18n } from 'i18n-js';
import * as Localization from 'expo-localization';
import {
  translations,
  SUPPORTED_LOCALES,
  SupportedLocale,
  RTL_LOCALES,
} from '../i18n/translations';

const LOCALE_KEY = 'zoneguard:locale';

const i18n = new I18n(translations);
i18n.enableFallback = true;
i18n.defaultLocale = 'en';

function isSupported(value: string | null | undefined): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

/** Device language when it is one we translate, otherwise English. */
function deviceLocale(): SupportedLocale {
  const tag = Localization.getLocales()[0]?.languageCode;
  return isSupported(tag) ? tag : 'en';
}

export interface LanguageContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  /** For translations stored as arrays, such as a question's answer options. */
  tList: (key: string) => string[];
  isRTL: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
      const initial = isSupported(stored) ? stored : deviceLocale();
      i18n.locale = initial;
      setLocaleState(initial);
    })();
  }, []);

  // Deliberately does not call I18nManager.forceRTL. That mirrors the entire
  // layout tree, which reorders the tab bar and every icon row, and it needs an
  // app restart to take effect. Direction is scoped to text content instead, so
  // navigation stays where the user expects and the switch is immediate.
  const setLocale = useCallback((next: SupportedLocale) => {
    i18n.locale = next;
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_KEY, next).catch((error) =>
      console.error('[Language] Failed to persist locale:', error)
    );
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      // Bound to locale so every consumer re-renders on a language change.
      t: (key, params) => i18n.t(key, params),
      tList: (key) => {
        const value = i18n.t(key) as unknown;
        return Array.isArray(value) ? (value as string[]) : [];
      },
      isRTL: RTL_LOCALES.includes(locale),
    }),
    [locale, setLocale]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider');
  return context;
}

export default LanguageProvider;

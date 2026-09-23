import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { I18nManager } from 'react-native';
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
  isRTL: boolean;
  /** True when the chosen language needs an app restart to lay out correctly. */
  needsRestart: boolean;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');
  const [needsRestart, setNeedsRestart] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await AsyncStorage.getItem(LOCALE_KEY).catch(() => null);
      const initial = isSupported(stored) ? stored : deviceLocale();
      i18n.locale = initial;
      setLocaleState(initial);

      // Layout direction is fixed at native startup, so a stored RTL locale
      // only renders correctly once the app has been relaunched with it set.
      const shouldBeRTL = RTL_LOCALES.includes(initial);
      if (I18nManager.isRTL !== shouldBeRTL) {
        I18nManager.allowRTL(shouldBeRTL);
        I18nManager.forceRTL(shouldBeRTL);
        setNeedsRestart(true);
      }
    })();
  }, []);

  const setLocale = useCallback((next: SupportedLocale) => {
    i18n.locale = next;
    setLocaleState(next);
    AsyncStorage.setItem(LOCALE_KEY, next).catch((error) =>
      console.error('[Language] Failed to persist locale:', error)
    );

    const shouldBeRTL = RTL_LOCALES.includes(next);
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
      setNeedsRestart(true);
    } else {
      setNeedsRestart(false);
    }
  }, []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      setLocale,
      // Bound to locale so every consumer re-renders on a language change.
      t: (key, params) => i18n.t(key, params),
      isRTL: RTL_LOCALES.includes(locale),
      needsRestart,
    }),
    [locale, setLocale, needsRestart]
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useLanguage must be used inside a LanguageProvider');
  return context;
}

export default LanguageProvider;

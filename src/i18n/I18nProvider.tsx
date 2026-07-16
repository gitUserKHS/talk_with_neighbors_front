import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

export type Locale = 'ko' | 'en';

const STORAGE_KEY = 'talk-with-neighbors.locale';
let runtimeLocale: Locale = 'ko';

export const resolveLocale = (savedLocale: string | null, browserLanguage: string): Locale => {
  if (savedLocale === 'ko' || savedLocale === 'en') return savedLocale;
  return browserLanguage.toLowerCase().startsWith('en') ? 'en' : 'ko';
};

export const selectTranslation = (locale: Locale, korean: string, english: string): string =>
  locale === 'ko' ? korean : english;

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') return 'ko';

  try {
    const savedLocale = window.localStorage.getItem(STORAGE_KEY);
    return resolveLocale(savedLocale, window.navigator.language);
  } catch {
    // Storage can be unavailable in private browsing or hardened browsers.
  }

  return resolveLocale(null, window.navigator.language);
};

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (korean: string, english: string) => string;
  formatNumber: (value: number) => string;
  formatDate: (
    value: string | number | Date,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
}

const defaultValue: I18nContextValue = {
  locale: 'ko',
  setLocale: () => undefined,
  t: (korean) => korean,
  formatNumber: (value) => value.toLocaleString('ko-KR'),
  formatDate: (value, options) => new Intl.DateTimeFormat('ko-KR', options).format(new Date(value)),
};

const I18nContext = createContext<I18nContextValue>(defaultValue);

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<Locale>(getInitialLocale);
  runtimeLocale = locale;

  const setLocale = useCallback((nextLocale: Locale) => {
    setLocaleState(nextLocale);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = locale === 'ko'
      ? '이웃톡 | 가까운 이웃과 나누는 일상'
      : 'Neighbor Talk | Share life with your neighborhood';
    document.querySelector<HTMLMetaElement>('meta[name="description"]')?.setAttribute(
      'content',
      locale === 'ko'
        ? '가까운 이웃과 일상을 나누고 취향이 맞는 모임을 발견해 보세요.'
        : 'Share everyday life with nearby neighbors and discover meetups that match your interests.',
    );

    try {
      window.localStorage.setItem(STORAGE_KEY, locale);
    } catch {
      // The selected language still works for the current session.
    }
  }, [locale]);

  const t = useCallback(
    (korean: string, english: string) => selectTranslation(locale, korean, english),
    [locale],
  );

  const formatNumber = useCallback(
    (value: number) => value.toLocaleString(locale === 'ko' ? 'ko-KR' : 'en-US'),
    [locale],
  );

  const formatDate = useCallback(
    (value: string | number | Date, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return new Intl.DateTimeFormat(locale === 'ko' ? 'ko-KR' : 'en-US', options).format(date);
    },
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, formatNumber, formatDate }),
    [formatDate, formatNumber, locale, setLocale, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);

export const localeStorageKey = STORAGE_KEY;

export const getRuntimeLocale = (): Locale => runtimeLocale;

export const getIntlLocale = (): 'ko-KR' | 'en-US' =>
  runtimeLocale === 'ko' ? 'ko-KR' : 'en-US';

export const translate = (korean: string, english: string): string =>
  selectTranslation(runtimeLocale, korean, english);

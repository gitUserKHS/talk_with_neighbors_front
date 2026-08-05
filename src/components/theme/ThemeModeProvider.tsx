import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { ThemeMode, createAppTheme } from '../../theme';

/** 사용자가 고른 값. system은 운영체제 설정을 따른다. */
export type ThemePreference = ThemeMode | 'system';

const STORAGE_KEY = 'talk-with-neighbors.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export const resolvePreference = (stored: string | null): ThemePreference =>
  stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'system';

export const resolveMode = (preference: ThemePreference, systemPrefersDark: boolean): ThemeMode => {
  if (preference === 'system') return systemPrefersDark ? 'dark' : 'light';
  return preference;
};

const readStoredPreference = (): ThemePreference => {
  if (typeof window === 'undefined') return 'system';
  try {
    return resolvePreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    // 시크릿 모드나 저장소를 막은 브라우저에서는 이번 세션만 기본값으로 동작한다.
    return 'system';
  }
};

const readSystemPrefersDark = (): boolean =>
  typeof window !== 'undefined'
  && typeof window.matchMedia === 'function'
  && window.matchMedia(DARK_QUERY).matches;

interface ThemeModeContextValue {
  preference: ThemePreference;
  mode: ThemeMode;
  setPreference: (preference: ThemePreference) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue>({
  preference: 'system',
  mode: 'light',
  setPreference: () => undefined,
});

export const ThemeModeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [preference, setPreferenceState] = useState<ThemePreference>(readStoredPreference);
  const [systemPrefersDark, setSystemPrefersDark] = useState<boolean>(readSystemPrefersDark);

  // 운영체제 설정을 따르는 동안에는 사용자가 다크 모드를 켜고 끄면 즉시 반영한다.
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return;

    const query = window.matchMedia(DARK_QUERY);
    const onChange = (event: MediaQueryListEvent) => setSystemPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // 저장에 실패해도 이번 세션에서는 선택이 유지된다.
    }
  }, []);

  const mode = resolveMode(preference, systemPrefersDark);
  const theme = useMemo(() => createAppTheme(mode), [mode]);

  // 주소창과 스크롤바 같은 브라우저 UI도 함께 어두워지도록 알린다.
  useEffect(() => {
    document.documentElement.style.colorScheme = mode;
    document.querySelector<HTMLMetaElement>('meta[name="theme-color"]')
      ?.setAttribute('content', mode === 'dark' ? '#14110F' : '#C84335');
  }, [mode]);

  const value = useMemo(
    () => ({ preference, mode, setPreference }),
    [mode, preference, setPreference],
  );

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  );
};

export const useThemeMode = () => useContext(ThemeModeContext);

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Appearance, useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { COLOR_THEME_KEYS, DEFAULT_COLOR_THEME, type ColorThemeKey } from '@pomoroutine/shared';
import { getThemeTokens, setActiveColorTheme, type ThemeTokens } from '@/constants/timerColors';

type Scheme = 'light' | 'dark';
export type ThemeMode = 'light' | 'dark' | 'system';

// 웹 STORAGE_KEYS.theme와 이름만 맞춤(예외적으로 접두사 없음) — 스토리지 자체는 별개(AsyncStorage)
const THEME_STORAGE_KEY = 'theme';
const COLOR_THEME_STORAGE_KEY = 'color-theme';

interface ThemeModeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  colorTheme: ColorThemeKey;
  setColorTheme: (key: ColorThemeKey) => void;
}

const ThemeModeContext = createContext<ThemeModeContextValue | null>(null);

export function ThemeModeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>('system');
  const [colorTheme, setColorThemeState] = useState<ColorThemeKey>(DEFAULT_COLOR_THEME);

  useEffect(() => {
    AsyncStorage.getItem(THEME_STORAGE_KEY).then((stored) => {
      if (stored === 'light' || stored === 'dark' || stored === 'system') {
        setModeState(stored);
      }
    });
    AsyncStorage.getItem(COLOR_THEME_STORAGE_KEY).then((stored) => {
      const key = COLOR_THEME_KEYS.find((k) => k === stored);
      if (key) {
        setActiveColorTheme(key);
        setColorThemeState(key);
      }
    });
  }, []);

  // 네이티브 화면 배경은 JS mode가 아니라 OS 트레이트(userInterfaceStyle)를 따르므로 강제 동기화
  useEffect(() => {
    Appearance.setColorScheme(mode === 'system' ? 'unspecified' : mode);
  }, [mode]);

  function setMode(next: ThemeMode) {
    setModeState(next);
    void AsyncStorage.setItem(THEME_STORAGE_KEY, next);
  }

  function setColorTheme(next: ColorThemeKey) {
    setActiveColorTheme(next); // 동기 갱신 — THEME의 primary getter가 다음 렌더에 바로 최신값 반환
    setColorThemeState(next);
    void AsyncStorage.setItem(COLOR_THEME_STORAGE_KEY, next);
  }

  return (
    <ThemeModeContext.Provider value={{ mode, setMode, colorTheme, setColorTheme }}>
      {children}
    </ThemeModeContext.Provider>
  );
}

export function useThemeMode(): ThemeModeContextValue {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useThemeMode must be used within ThemeModeProvider');
  return ctx;
}

export function useColorTheme(): {
  colorTheme: ColorThemeKey;
  setColorTheme: (key: ColorThemeKey) => void;
} {
  const ctx = useContext(ThemeModeContext);
  if (!ctx) throw new Error('useColorTheme must be used within ThemeModeProvider');
  return { colorTheme: ctx.colorTheme, setColorTheme: ctx.setColorTheme };
}

export function useThemeScheme(): Scheme {
  const system = useColorScheme();
  const modeCtx = useContext(ThemeModeContext);
  const mode = modeCtx?.mode ?? 'system';
  return mode === 'system' ? (system === 'dark' ? 'dark' : 'light') : mode;
}

export function useThemeTokens(): ThemeTokens {
  const scheme = useThemeScheme();
  const colorTheme = useContext(ThemeModeContext)?.colorTheme ?? DEFAULT_COLOR_THEME;
  return getThemeTokens(scheme, colorTheme);
}

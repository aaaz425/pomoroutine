import {
  COLOR_THEMES,
  DEFAULT_COLOR_THEME,
  type ColorThemeKey,
  type TimerPhase,
} from '@pomoroutine/shared';

let activeColorTheme: ColorThemeKey = DEFAULT_COLOR_THEME;

export function setActiveColorTheme(key: ColorThemeKey): void {
  activeColorTheme = key;
}

export const PHASE_LABELS: Record<TimerPhase, string> = {
  focus: '집중 중',
  'short-break': '휴식 중',
};

// 웹의 Tailwind 알파 표기(예: bg-muted/60)에 대응 — hex를 rgba 문자열로 변환
export function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

const SHORT_BREAK_HEX = '#60A5FA';

// focus는 선택된 컬러 테마의 accent를 따라감, short-break는 테마와 무관한 고정 파랑
export function phaseHex(
  phase: TimerPhase,
  scheme: 'light' | 'dark',
  colorTheme: ColorThemeKey,
): string {
  return phase === 'focus' ? COLOR_THEMES[colorTheme].accent[scheme].color : SHORT_BREAK_HEX;
}

export function phaseBadge(
  phase: TimerPhase,
  scheme: 'light' | 'dark',
  colorTheme: ColorThemeKey,
): { bg: string; dot: string; text: string } {
  const hex = phaseHex(phase, scheme, colorTheme);
  return { bg: withAlpha(hex, 0.102), dot: hex, text: hex };
}

// 글로우 중심 색상(alpha 18.8%) — 바깥으로 갈수록 transparent
export function phaseGlowRgba(
  phase: TimerPhase,
  scheme: 'light' | 'dark',
  colorTheme: ColorThemeKey,
): string {
  return withAlpha(phaseHex(phase, scheme, colorTheme), 0.188);
}

export interface ThemeTokens {
  background: string;
  foreground: string;
  card: string;
  popover: string;
  primary: string;
  primaryForeground: string;
  muted: string;
  mutedForeground: string;
  border: string;
  destructive: string;
  success: string;
  info: string;
}

export const THEME: Record<'light' | 'dark', ThemeTokens> = {
  light: {
    background: '#FFFFFF',
    foreground: '#111111',
    card: '#F8F9FA',
    popover: '#F5F5F5',
    get primary() {
      return COLOR_THEMES[activeColorTheme].accent.light.color;
    },
    get primaryForeground() {
      return COLOR_THEMES[activeColorTheme].accent.light.foreground;
    },
    muted: '#EFEFEF',
    mutedForeground: '#374151',
    border: '#E5E7EB',
    destructive: '#EF4444',
    success: '#22C55E',
    info: '#3B82F6',
  },
  dark: {
    background: '#07090F',
    foreground: '#F0F4F8',
    card: '#0D1117',
    popover: '#111827',
    get primary() {
      return COLOR_THEMES[activeColorTheme].accent.dark.color;
    },
    get primaryForeground() {
      return COLOR_THEMES[activeColorTheme].accent.dark.foreground;
    },
    muted: '#1A2332',
    mutedForeground: '#94A3B8',
    border: '#1E2D3D',
    destructive: '#EF4444',
    success: '#22C55E',
    info: '#3B82F6',
  },
};

const themeTokensCache = new Map<string, ThemeTokens>();

export function getThemeTokens(scheme: 'light' | 'dark', colorTheme: ColorThemeKey): ThemeTokens {
  const key = `${scheme}:${colorTheme}`;
  const cached = themeTokensCache.get(key);
  if (cached) return cached;
  const accent = COLOR_THEMES[colorTheme].accent[scheme];
  const tokens = { ...THEME[scheme], primary: accent.color, primaryForeground: accent.foreground };
  themeTokensCache.set(key, tokens);
  return tokens;
}

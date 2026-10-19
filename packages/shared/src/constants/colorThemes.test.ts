import { describe, expect, it } from 'vitest';

import { COLOR_THEME_KEYS, COLOR_THEMES } from './colorThemes';

function relativeLuminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
  const channel = (c: number) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  const [rl, gl, bl] = [r, g, b].map(channel);
  return 0.2126 * rl + 0.7152 * gl + 0.0722 * bl;
}

function contrastRatio(a: string, b: string): number {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

describe('COLOR_THEMES', () => {
  // 기존 --primary(#10d9a0)의 흰 배경 대비가 1.83이라 WCAG 3:1은 이 앱 기준에 안 맞음 — near-white급 회귀만 차단
  it.each(COLOR_THEME_KEYS)('%s: 라이트 모드 accent가 흰 배경과 최소 대비를 만족함', (key) => {
    expect(contrastRatio(COLOR_THEMES[key].accent.light.color, '#ffffff')).toBeGreaterThanOrEqual(
      1.8,
    );
  });

  it.each(COLOR_THEME_KEYS)(
    '%s: accent/foreground 페어가 각 모드에서 읽을 수 있는 대비를 만족함',
    (key) => {
      const { light, dark } = COLOR_THEMES[key].accent;
      expect(contrastRatio(light.color, light.foreground)).toBeGreaterThanOrEqual(4.5);
      expect(contrastRatio(dark.color, dark.foreground)).toBeGreaterThanOrEqual(4.5);
    },
  );
});

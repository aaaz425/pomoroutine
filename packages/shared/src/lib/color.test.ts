import { describe, expect, it } from 'vitest';

import { hexToHsv, hsvToHex } from './color';

describe('hexToHsv / hsvToHex', () => {
  it('원색과 무채색을 정확한 hsv로 변환', () => {
    expect(hexToHsv('#ff0000')).toEqual({ h: 0, s: 1, v: 1 });
    expect(hexToHsv('#0000ff')).toEqual({ h: 240, s: 1, v: 1 });
    expect(hexToHsv('#ffffff')).toEqual({ h: 0, s: 0, v: 1 });
    expect(hexToHsv('#000000')).toEqual({ h: 0, s: 0, v: 0 });
  });

  it('hex → hsv → hex 왕복이 원래 값과 같음', () => {
    for (const hex of ['#ff0000', '#00ff00', '#3b82f6', '#22c55e', '#f97316', '#6b7280']) {
      const { h, s, v } = hexToHsv(hex);
      expect(hsvToHex(h, s, v)).toBe(hex);
    }
  });
});

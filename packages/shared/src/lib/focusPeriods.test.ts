import { describe, expect, it } from 'vitest';

import type { FocusPeriod } from '../types/timer';
import { normalizeFocusPeriods, clampPeriodDuration } from './focusPeriods';

const BASE = new Date('2024-01-01T00:00:00.000Z').getTime();

function period(startOffsetMs: number, endOffsetMs: number): FocusPeriod {
  return {
    start: new Date(BASE + startOffsetMs).toISOString(),
    end: new Date(BASE + endOffsetMs).toISOString(),
  };
}

describe('normalizeFocusPeriods', () => {
  it('5초 미만 구간은 제거하고 정확히 5초부터 유지', () => {
    const kept = period(10_000, 15_000);
    expect(normalizeFocusPeriods([period(0, 4999), kept])).toEqual([kept]);
  });

  it('5초 이하 일시정지로 나뉜 구간은 병합하고 넘으면 분리', () => {
    const a = period(0, 10_000);
    const b = period(15_000, 20_000);
    const c = period(25_001, 35_000);
    expect(normalizeFocusPeriods([a, b, c])).toEqual([{ start: a.start, end: b.end }, c]);
  });

  it('필터와 병합을 마친 뒤 100개를 넘는 뒤쪽 구간만 버림', () => {
    const noisy = period(0, 2000);
    const kept = Array.from({ length: 101 }, (_, i) =>
      period(10_000 + i * 20_000, 10_000 + i * 20_000 + 10_000),
    );
    expect(normalizeFocusPeriods([noisy, ...kept])).toEqual(kept.slice(0, 100));
  });
});

describe('clampPeriodDuration', () => {
  it('상한을 넘으면 end를 start + 상한으로 자름', () => {
    const maxSeconds = 120 * 60;
    const p = period(0, maxSeconds * 1000 + 60_000);
    expect(clampPeriodDuration(p, maxSeconds)).toEqual({
      start: p.start,
      end: new Date(BASE + maxSeconds * 1000).toISOString(),
    });
  });
});

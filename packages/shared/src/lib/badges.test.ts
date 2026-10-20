import { describe, expect, it } from 'vitest';

import { getEarnedBadgeIds, type BadgeProgress } from './badges';

function makeProgress(overrides: Partial<BadgeProgress> = {}): BadgeProgress {
  return {
    maxStreakDays: 0,
    totalFocusSeconds: 0,
    categoryCount: 0,
    specialEvents: {
      'first-session': false,
      'night-owl': false,
      'weekend-warrior': false,
      'perfect-session': false,
      marathon: false,
    },
    ...overrides,
  };
}

describe('getEarnedBadgeIds', () => {
  it('스트릭, 누적 시간, 카테고리 수는 기준값 이상이면 획득', () => {
    const earned = getEarnedBadgeIds(
      makeProgress({ maxStreakDays: 3, totalFocusSeconds: 3600, categoryCount: 2 }),
    );
    expect([...earned].sort()).toEqual(['diversity-2', 'streak-3', 'total-time-1h']);
  });

  it('특별 이벤트는 해당 여부만큼만 획득', () => {
    const earned = getEarnedBadgeIds(
      makeProgress({
        specialEvents: {
          'first-session': true,
          'night-owl': false,
          'weekend-warrior': true,
          'perfect-session': false,
          marathon: true,
        },
      }),
    );
    expect([...earned].sort()).toEqual(['first-session', 'marathon', 'weekend-warrior']);
  });
});

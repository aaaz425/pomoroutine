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
  it('진행도가 없으면 아무 뱃지도 없음', () => {
    expect(getEarnedBadgeIds(makeProgress())).toEqual(new Set());
  });

  it('최장 연속 기록 기준으로 스트릭 뱃지 판정', () => {
    const earned = getEarnedBadgeIds(makeProgress({ maxStreakDays: 3 }));
    expect(earned.has('streak-3')).toBe(true);
    expect(earned.has('streak-7')).toBe(false);
  });

  it('누적 집중 시간 기준으로 total-time 뱃지 판정', () => {
    const earned = getEarnedBadgeIds(makeProgress({ totalFocusSeconds: 3600 }));
    expect(earned.has('total-time-1h')).toBe(true);
    expect(earned.has('total-time-10h')).toBe(false);
  });

  it('사용한 카테고리 수 기준으로 다양성 뱃지 판정', () => {
    const earned = getEarnedBadgeIds(makeProgress({ categoryCount: 2 }));
    expect(earned.has('diversity-2')).toBe(true);
    expect(earned.has('diversity-3')).toBe(false);
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

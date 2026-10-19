import { describe, expect, it } from 'vitest';

import type { Category, Session } from '@/types';
import {
  getCategoryFocusRatings,
  getFocusRatingTrend,
  getLowestRatingDayOfWeek,
  getTopDistractions,
} from './journalInsights';

let idCounter = 0;

function makeSession(overrides: Partial<Session> = {}): Session {
  idCounter += 1;
  return {
    id: `s${idCounter}`,
    taskId: null,
    title: null,
    mode: 'pomodoro',
    startedAt: '2024-03-15T09:00:00',
    endedAt: '2024-03-15T09:30:00',
    completedCycles: 1,
    totalCycles: 4,
    focusSeconds: 1500,
    pausedSeconds: 0,
    focusPeriods: [],
    note: null,
    focusRating: null,
    distractionTags: [],
    ...overrides,
  };
}

const TODAY = new Date('2024-03-15T12:00:00');

describe('getTopDistractions', () => {
  it('빈도 내림차순으로 top3까지만 반환', () => {
    const sessions = [
      makeSession({ startedAt: '2024-03-15T09:00:00', distractionTags: ['phone', 'noise'] }),
      makeSession({ startedAt: '2024-03-14T09:00:00', distractionTags: ['phone', 'noise'] }),
      makeSession({ startedAt: '2024-03-13T09:00:00', distractionTags: ['phone'] }),
      makeSession({ startedAt: '2024-03-12T09:00:00', distractionTags: ['fatigue'] }),
      makeSession({ startedAt: '2024-03-11T09:00:00', distractionTags: ['people'] }),
    ];
    const result = getTopDistractions(sessions, 14, TODAY);
    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({ tagId: 'phone', count: 3 });
    expect(result[1]).toEqual({ tagId: 'noise', count: 2 });
  });

  it('N일 범위 밖 세션은 제외됨', () => {
    const sessions = [
      makeSession({ startedAt: '2024-02-28T09:00:00', distractionTags: ['phone'] }),
    ];
    expect(getTopDistractions(sessions, 14, TODAY)).toEqual([]);
  });
});

describe('getFocusRatingTrend', () => {
  it('최근 7일과 이전 7일의 평균 집중도를 정상적으로 비교', () => {
    const sessions = [
      makeSession({ startedAt: '2024-03-15T09:00:00', focusRating: 3 }),
      makeSession({ startedAt: '2024-03-10T09:00:00', focusRating: 3 }),
      makeSession({ startedAt: '2024-03-08T23:00:00', focusRating: 2 }),
      makeSession({ startedAt: '2024-03-03T09:00:00', focusRating: 1 }),
    ];
    const result = getFocusRatingTrend(sessions, 7, TODAY);
    expect(result.recentAvg).toBe(3);
    expect(result.previousAvg).toBe(1.5);
    expect(result.sampleSize).toBe(2);
  });

  it('focusRating이 null인 세션은 평균 계산에서 제외됨', () => {
    const sessions = [
      makeSession({ startedAt: '2024-03-15T09:00:00', focusRating: 3 }),
      makeSession({ startedAt: '2024-03-14T09:00:00', focusRating: null }),
    ];
    const result = getFocusRatingTrend(sessions, 7, TODAY);
    expect(result.recentAvg).toBe(3);
    expect(result.sampleSize).toBe(1);
  });

  it('양쪽 다 표본이 없으면 recentAvg/previousAvg가 null, sampleSize는 0', () => {
    expect(getFocusRatingTrend([], 7, TODAY)).toEqual({
      recentAvg: null,
      previousAvg: null,
      sampleSize: 0,
    });
  });
});

describe('getCategoryFocusRatings', () => {
  const categories: Category[] = [
    { id: 'cat-study', name: '공부', color: 'bg-blue-500' },
    { id: 'cat-work', name: '업무', color: 'bg-green-500' },
  ];

  it('카테고리별 평균 집중도를 높은 순으로 반환', () => {
    const result = getCategoryFocusRatings(
      [
        { categoryId: 'cat-study', sum: 6, count: 3 },
        { categoryId: 'cat-work', sum: 9, count: 3 },
      ],
      categories,
      3,
    );
    expect(result).toEqual([
      { categoryId: 'cat-work', categoryName: '업무', avgRating: 3, sampleSize: 3 },
      { categoryId: 'cat-study', categoryName: '공부', avgRating: 2, sampleSize: 3 },
    ]);
  });

  it('표본이 minSamples 미만이거나 지금 없는 카테고리는 제외', () => {
    expect(
      getCategoryFocusRatings(
        [
          { categoryId: 'cat-study', sum: 5, count: 2 },
          { categoryId: 'deleted', sum: 9, count: 3 },
        ],
        categories,
        3,
      ),
    ).toEqual([]);
  });
});

describe('getLowestRatingDayOfWeek', () => {
  it('요일별 평균 중 가장 낮은 요일을 반환', () => {
    const sessions = [
      makeSession({ startedAt: '2024-03-12T09:00:00', focusRating: 1 }), // 화요일
      makeSession({ startedAt: '2024-03-13T09:00:00', focusRating: 3 }), // 수요일
      makeSession({ startedAt: '2024-03-14T09:00:00', focusRating: 3 }), // 목요일
    ];
    expect(getLowestRatingDayOfWeek(sessions, TODAY)).toBe('화요일');
  });

  it('평점 표본이 없으면 null 반환', () => {
    expect(getLowestRatingDayOfWeek([], TODAY)).toBeNull();
  });

  it('동률일 때는 요일 인덱스(일요일부터)가 빠른 쪽을 반환', () => {
    const sessions = [
      makeSession({ startedAt: '2024-03-12T09:00:00', focusRating: 2 }), // 화요일(index 2)
      makeSession({ startedAt: '2024-03-10T09:00:00', focusRating: 2 }), // 일요일(index 0)
    ];
    expect(getLowestRatingDayOfWeek(sessions, TODAY)).toBe('일요일');
  });
});

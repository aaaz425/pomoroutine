import { describe, expect, it } from 'vitest';

import type { Category, DashboardSummary, Session, Task } from '@/types';
import {
  getAllTimeCategoryFocus,
  getAllTimeFocusTrend,
  getDashboardRange,
  getTabStats,
  limitCategoryFocus,
} from './dashboard';

function makeSession(startedAt: string, focusSeconds = 1500): Session {
  return {
    id: startedAt,
    taskId: null,
    title: null,
    mode: 'pomodoro',
    startedAt,
    endedAt: new Date(new Date(startedAt).getTime() + focusSeconds * 1000).toISOString(),
    completedCycles: 1,
    totalCycles: 4,
    focusSeconds,
    pausedSeconds: 0,
    focusPeriods: [],
    note: null,
    focusRating: null,
    distractionTags: [],
  };
}

const TODAY = new Date('2024-03-15T12:00:00');

const CATEGORIES: Category[] = [
  { id: 'study', name: '공부', color: '#3b82f6' },
  { id: 'work', name: '업무', color: '#22c55e' },
];
const TASKS: Task[] = [
  { id: 't1', title: '알고리즘', categoryId: 'study', createdAt: '2024-01-01T00:00:00' },
];

function makeSummary(overrides: Partial<DashboardSummary['allTime']> = {}): DashboardSummary {
  return {
    streakDays: 0,
    maxStreakDays: 0,
    monthlyActivity: [],
    monthFocusSeconds: 0,
    busiestDay: null,
    firstSessionDate: null,
    prevDay: { focusSeconds: 0, count: 0 },
    prevWeek: { focusSeconds: 0, count: 0 },
    prevMonth: { focusSeconds: 0, count: 0 },
    allTime: {
      focusSeconds: 0,
      count: 0,
      yearlyCategoryMinutes: [],
      hourlySeconds: Array(24).fill(0),
      ...overrides,
    },
    badgeStats: {
      categoryCount: 0,
      nightOwl: false,
      weekendWarrior: false,
      perfectSession: false,
      marathon: false,
    },
  };
}

describe('getDashboardRange', () => {
  it('이번 주와 이번 달을 모두 덮는 구간', () => {
    const { startIso, endIso } = getDashboardRange(new Date('2024-03-01T12:00:00'));
    expect(new Date(startIso)).toEqual(new Date('2024-02-26T00:00:00'));
    expect(new Date(endIso)).toEqual(new Date('2024-04-01T00:00:00'));
  });

  it('주가 다음 달로 넘어가면 주 끝까지 포함', () => {
    const { startIso, endIso } = getDashboardRange(new Date('2024-04-30T12:00:00'));
    expect(new Date(startIso)).toEqual(new Date('2024-04-01T00:00:00'));
    expect(new Date(endIso)).toEqual(new Date('2024-05-06T00:00:00'));
  });
});

describe('getAllTimeFocusTrend', () => {
  it('연도별로 카테고리 분을 합치고 없는 카테고리는 미분류', () => {
    const trend = getAllTimeFocusTrend(
      [
        { year: '2024', categoryId: 'study', minutes: 30 },
        { year: '2023', categoryId: null, minutes: 10 },
        { year: '2024', categoryId: 'deleted', minutes: 5 },
      ],
      CATEGORIES,
    );
    expect(trend.data).toEqual([
      { label: '2023', 미분류: 10 },
      { label: '2024', 공부: 30, 미분류: 5 },
    ]);
    expect(trend.categories.map((c) => c.name)).toEqual(['공부', '미분류']);
  });
});

describe('getAllTimeCategoryFocus', () => {
  it('연도를 합쳐 카테고리 비율 계산', () => {
    const items = getAllTimeCategoryFocus(
      [
        { year: '2023', categoryId: 'study', minutes: 30 },
        { year: '2024', categoryId: 'study', minutes: 30 },
        { year: '2024', categoryId: 'work', minutes: 20 },
      ],
      CATEGORIES,
    );
    expect(items.map((i) => [i.name, i.minutes, i.percent])).toEqual([
      ['공부', 60, 75],
      ['업무', 20, 25],
    ]);
  });
});

describe('getTabStats', () => {
  const periodSessions = [
    { ...makeSession('2024-03-15T09:00:00', 1500), taskId: 't1' },
    makeSession('2024-03-11T09:00:00', 600),
    makeSession('2024-03-01T09:00:00', 900),
  ];

  it('기간 탭은 범위 조회 결과를 필터링해 계산', () => {
    const stats = getTabStats('week', periodSessions, makeSummary(), TASKS, CATEGORIES, TODAY);
    expect(stats.focusSeconds).toBe(2100);
    expect(stats.count).toBe(2);
    expect(stats.avgSeconds).toBe(1050);
    expect(stats.categoryFocus.map((i) => i.name)).toEqual(['공부', '미분류']);
  });

  it('전체 탭은 RPC 집계를 그대로 사용', () => {
    const hourlySeconds = Array(24).fill(0);
    hourlySeconds[9] = 3000;
    const summary = makeSummary({
      focusSeconds: 3000,
      count: 4,
      yearlyCategoryMinutes: [{ year: '2024', categoryId: 'study', minutes: 50 }],
      hourlySeconds,
    });
    const stats = getTabStats('all', periodSessions, summary, TASKS, CATEGORIES, TODAY);
    expect(stats.focusSeconds).toBe(3000);
    expect(stats.count).toBe(4);
    expect(stats.avgSeconds).toBe(750);
    expect(stats.focusTrend.data).toEqual([{ label: '2024', 공부: 50 }]);
    expect(stats.hourlySeconds).toBe(hourlySeconds);
  });

  it('주 탭은 요일로, 월 탭은 주차로 나누고 29일 이후는 4주차', () => {
    const minutes = (data: Record<string, string | number>[], label: string) =>
      data.find((d) => d.label === label)?.['미분류'];
    const week = getTabStats(
      'week',
      [makeSession('2024-03-17T12:00:00', 1500)],
      makeSummary(),
      TASKS,
      CATEGORIES,
      TODAY,
    );
    expect(minutes(week.focusTrend.data, '일')).toBe(25);

    const month = getTabStats(
      'month',
      [makeSession('2024-03-01T09:00:00', 900), makeSession('2024-03-30T09:00:00', 1500)],
      makeSummary(),
      TASKS,
      CATEGORIES,
      TODAY,
    );
    expect(minutes(month.focusTrend.data, '1주차')).toBe(15);
    expect(minutes(month.focusTrend.data, '4주차')).toBe(25);
  });
});

describe('limitCategoryFocus', () => {
  const items = [40, 25, 15, 10, 6, 4].map((percent, i) => ({
    name: `c${i}`,
    minutes: percent,
    percent,
    color: '#000000',
  }));

  it('초과하면 상위 항목만 남기고 나머지를 하나로 합침', () => {
    const result = limitCategoryFocus(items, 5);
    expect(result.map((i) => i.name)).toEqual(['c0', 'c1', 'c2', 'c3', '그 외 2개']);
    expect(result[4]).toMatchObject({ minutes: 10, percent: 10 });
  });
});

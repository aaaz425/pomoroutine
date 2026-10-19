import { describe, expect, it } from 'vitest';
import type { Session } from '../types/session';
import type { FocusPeriod } from '../types/timer';
import {
  filterSessionsByTab,
  getAvgSessionSeconds,
  getHourlyFocusSeconds,
  getMonthlyActivityData,
  getTotalFocusSeconds,
} from './dashboard';

function makeSession(startedAt: string, focusSeconds = 1500, focusPeriods: FocusPeriod[] = []) {
  return { id: startedAt, taskId: null, startedAt, focusSeconds, focusPeriods } satisfies Pick<
    Session,
    'id' | 'taskId' | 'startedAt' | 'focusSeconds' | 'focusPeriods'
  >;
}

const TODAY = new Date('2024-03-15T12:00:00');

describe('filterSessionsByTab', () => {
  const sessions = [
    makeSession('2024-03-15T09:00:00'),
    makeSession('2024-03-15T14:00:00'),
    makeSession('2024-03-12T10:00:00'),
    makeSession('2024-03-10T10:00:00'),
    makeSession('2024-03-01T10:00:00'),
    makeSession('2024-02-20T10:00:00'),
  ];

  it('오늘, 월요일 시작 이번 주, 이번 달, 전체로 거름', () => {
    expect(filterSessionsByTab(sessions, 'today', TODAY)).toHaveLength(2);
    expect(filterSessionsByTab(sessions, 'week', TODAY)).toHaveLength(3);
    expect(filterSessionsByTab(sessions, 'month', TODAY)).toHaveLength(5);
    expect(filterSessionsByTab(sessions, 'all', TODAY)).toHaveLength(6);
  });
});

describe('집계', () => {
  it('합계와 평균, 빈 배열 평균은 0', () => {
    const sessions = [
      makeSession('2024-03-15T09:00:00', 1800),
      makeSession('2024-03-15T14:00:00', 900),
    ];
    expect(getTotalFocusSeconds(sessions)).toBe(2700);
    expect(getAvgSessionSeconds(sessions)).toBe(1350);
    expect(getAvgSessionSeconds([])).toBe(0);
  });
});

describe('getMonthlyActivityData', () => {
  it('이번 달 모든 날짜를 만들고 날짜별 집중 분을 합산, 1분 미만은 1분', () => {
    const result = getMonthlyActivityData(
      [
        makeSession('2024-03-15T09:00:00', 1800),
        makeSession('2024-03-15T14:00:00', 900),
        makeSession('2024-03-10T10:00:00', 20),
        makeSession('2024-02-20T09:00:00', 3600),
      ],
      TODAY,
    );
    const minutes = (date: string) => result.find((d) => d.date === date)?.focusMinutes;
    expect(result).toHaveLength(31);
    expect(minutes('2024-03-15')).toBe(45);
    expect(minutes('2024-03-10')).toBe(1);
    expect(minutes('2024-03-01')).toBe(0);
    expect(result.reduce((sum, d) => sum + d.focusMinutes, 0)).toBe(46);
  });
});

describe('getHourlyFocusSeconds', () => {
  const hourly = (focusSeconds: number, ...periods: [string, string][]) =>
    getHourlyFocusSeconds([
      makeSession(
        '2024-03-15T09:00:00',
        focusSeconds,
        periods.map(([start, end]) => ({ start: `2024-03-15T${start}`, end: `2024-03-15T${end}` })),
      ),
    ]);

  it('구간을 걸친 시간대만큼 나눠 담고 시 경계에서 끝나면 다음 시간대로 넘기지 않음', () => {
    const spread = hourly(6300, ['09:30:00', '11:15:00']);
    expect([spread[9], spread[10], spread[11]]).toEqual([30 * 60, 60 * 60, 15 * 60]);
    expect(hourly(3600, ['09:00:00', '10:00:00'])[10]).toBe(0);
  });

  it('구간이 없으면 시작 시간대에 집중 시간 전체를 담음', () => {
    expect(hourly(1500)[9]).toBe(1500);
  });

  it('120분을 넘는 구간은 120분까지만 반영', () => {
    expect(hourly(21600, ['09:00:00', '15:00:00']).reduce((a, b) => a + b, 0)).toBe(120 * 60);
  });
});

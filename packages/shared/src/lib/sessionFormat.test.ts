import { describe, expect, it } from 'vitest';
import type { Session } from '../types/session';
import type { FocusPeriod } from '../types/timer';
import {
  formatClock,
  formatCount,
  formatDuration,
  formatFocusPeriodRanges,
  formatSessionProgressLabel,
  formatSessionTimeSummary,
  formatStartedAtLabel,
  formatTimeRange,
  getSessionOrdinalTitle,
  getSessionsForDate,
  groupSessionsByDate,
  hasAbnormalFocusGap,
} from './sessionFormat';

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

function period(start: string, end: string): FocusPeriod {
  return { start, end };
}

const TODAY = new Date('2024-03-15T12:00:00');
const NOW = new Date(2024, 0, 2, 16, 30).getTime();

describe('formatStartedAtLabel', () => {
  it('오늘이면 시각만, 어제면 어제, 그 이전이면 날짜를 붙임', () => {
    expect(formatStartedAtLabel(new Date(2024, 0, 2, 15, 52).getTime(), NOW)).toBe('오후 3:52');
    expect(formatStartedAtLabel(new Date(2024, 0, 1, 9, 5).getTime(), NOW)).toBe('어제 오전 9:05');
    expect(formatStartedAtLabel(new Date(2023, 11, 30, 21, 0).getTime(), NOW)).toBe(
      '12월 30일 오후 9:00',
    );
  });
});

describe('groupSessionsByDate', () => {
  it('로컬 날짜별로 묶고 날짜와 그룹 안 세션을 최신순으로 정렬', () => {
    const groups = groupSessionsByDate(
      [
        makeSession('2024-03-10T23:50:00', 1200),
        makeSession('2024-03-15T09:00:00', 600),
        makeSession('2024-03-15T14:00:00', 900),
      ],
      TODAY,
    );
    expect(groups.map((g) => g.dateKey)).toEqual(['2024-03-15', '2024-03-10']);
    expect(groups[0].sessions.map((s) => s.startedAt)).toEqual([
      '2024-03-15T14:00:00',
      '2024-03-15T09:00:00',
    ]);
    expect(groups[0].totalFocusSeconds).toBe(1500);
  });

  it('오늘, 어제, 그 외 날짜 라벨', () => {
    const labels = groupSessionsByDate(
      [
        makeSession('2024-03-15T09:00:00'),
        makeSession('2024-03-14T09:00:00'),
        makeSession('2024-03-01T09:00:00'),
      ],
      TODAY,
    ).map((g) => g.displayLabel);
    expect(labels).toEqual(['오늘', '어제', '3월 1일 (금)']);
  });
});

describe('getSessionsForDate', () => {
  it('해당 로컬 날짜의 세션만 반환하고 자정 경계는 제외', () => {
    const sessions = [
      makeSession('2024-03-14T23:59:59'),
      makeSession('2024-03-15T09:00:00'),
      makeSession('2024-03-15T20:00:00'),
      makeSession('2024-03-16T00:00:00'),
    ];
    const result = getSessionsForDate(sessions, new Date('2024-03-15T12:00:00'));
    expect(result.map((s) => s.startedAt)).toEqual(['2024-03-15T09:00:00', '2024-03-15T20:00:00']);
  });
});

describe('표시 형식', () => {
  it('getSessionOrdinalTitle은 0부터 센 순서에 1을 더해 표시', () => {
    expect(getSessionOrdinalTitle('2024-03-15T09:00:00', 0)).toBe('3월 15일 1번째 기록');
  });

  it('formatCount는 천 단위 콤마', () => {
    expect(formatCount(10087)).toBe('10,087');
  });

  it('formatClock은 1시간 이상이면 H:MM:SS', () => {
    expect(formatClock(65)).toBe('01:05');
    expect(formatClock(3725)).toBe('1:02:05');
  });

  it('formatDuration 단위 경계', () => {
    expect(formatDuration(45)).toBe('45초');
    expect(formatDuration(60)).toBe('1분');
    expect(formatDuration(3600)).toBe('1시간');
    expect(formatDuration(5460)).toBe('1시간 31분');
    expect(formatDuration(25 * 3600 + 30 * 60)).toBe('1일 1시간');
    expect(formatDuration(24 * 3600 + 30 * 60)).toBe('1일');
  });

  it('formatTimeRange는 24시간제', () => {
    expect(formatTimeRange('2024-03-15T09:00:00', '2024-03-15T23:30:00')).toBe('09:00 — 23:30');
  });

  it('formatSessionProgressLabel은 포모도로면 사이클, 자유 모드면 집중 시간', () => {
    expect(
      formatSessionProgressLabel('pomodoro', { cycleCount: 2, totalCycles: 4, focusSeconds: 3000 }),
    ).toBe('완료된 사이클 2 / 4');
    expect(
      formatSessionProgressLabel('free', { cycleCount: 0, totalCycles: 0, focusSeconds: 90 }),
    ).toBe('자유 집중 1분');
  });
});

describe('formatFocusPeriodRanges', () => {
  it('구간을 쉼표로 잇고 120분 초과 구간은 잘라서 표시', () => {
    expect(formatFocusPeriodRanges([])).toBe('');
    expect(
      formatFocusPeriodRanges([
        period('2024-03-15T09:00:00', '2024-03-15T09:05:00'),
        period('2024-03-15T18:00:00', '2024-03-15T23:00:00'),
      ]),
    ).toBe('09:00 — 09:05, 18:00 — 20:00');
  });

  it('maxShown을 넘으면 나머지를 외 N개로 축약', () => {
    const periods = ['09', '10', '11', '12', '13'].map((h) =>
      period(`2024-03-15T${h}:00:00`, `2024-03-15T${h}:05:00`),
    );
    expect(formatFocusPeriodRanges(periods, 2)).toBe('09:00 — 09:05, 10:00 — 10:05 외 3개');
  });
});

describe('구간 간격', () => {
  it('간격이 휴식 상한 60분을 넘을 때만 비정상으로 보고 요약에 구간 수를 붙임', () => {
    const normal = [
      period('2024-03-15T09:00:00', '2024-03-15T09:25:00'),
      period('2024-03-15T10:25:00', '2024-03-15T10:50:00'),
    ];
    const abnormal = [
      period('2024-03-15T09:00:00', '2024-03-15T09:25:00'),
      period('2024-03-15T10:25:01', '2024-03-15T10:50:00'),
    ];
    expect(hasAbnormalFocusGap(normal)).toBe(false);
    expect(hasAbnormalFocusGap(abnormal)).toBe(true);
    expect(formatSessionTimeSummary('2024-03-15T09:00:00', '2024-03-15T10:50:00', normal)).toBe(
      '09:00 — 10:50',
    );
    expect(formatSessionTimeSummary('2024-03-15T09:00:00', '2024-03-15T10:50:00', abnormal)).toBe(
      '09:00 — 10:50 · 2구간',
    );
  });
});

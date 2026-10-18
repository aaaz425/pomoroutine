import { describe, expect, it, vi } from 'vitest';

import type { FocusPeriod, Session } from '@/types';
import {
  formatCount,
  formatDuration,
  formatFocusPeriodRanges,
  formatFullDate,
  formatSessionProgressLabel,
  formatSessionTimeSummary,
  formatTimeRange,
  getSessionOrdinalTitle,
  getSessionsForDate,
  groupSessionsByDate,
  hasAbnormalFocusGap,
} from './sessionUtils';

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

describe('groupSessionsByDate', () => {
  it('세션이 없으면 빈 배열 반환', () => {
    expect(groupSessionsByDate([], TODAY)).toEqual([]);
  });

  it('같은 날짜의 세션은 하나의 그룹으로 묶임', () => {
    const sessions = [makeSession('2024-03-15T09:00:00'), makeSession('2024-03-15T14:00:00')];
    const groups = groupSessionsByDate(sessions, TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].sessions).toHaveLength(2);
  });

  it('날짜 그룹은 최신 날짜부터 내림차순 정렬됨', () => {
    const sessions = [
      makeSession('2024-03-10T09:00:00'),
      makeSession('2024-03-15T09:00:00'),
      makeSession('2024-03-12T09:00:00'),
    ];
    const groups = groupSessionsByDate(sessions, TODAY);
    expect(groups.map((g) => g.dateKey)).toEqual(['2024-03-15', '2024-03-12', '2024-03-10']);
  });

  it('그룹 내 세션은 startedAt 기준 최신순으로 정렬됨', () => {
    const sessions = [makeSession('2024-03-15T09:00:00'), makeSession('2024-03-15T14:00:00')];
    const groups = groupSessionsByDate(sessions, TODAY);
    expect(groups[0].sessions.map((s) => s.startedAt)).toEqual([
      '2024-03-15T14:00:00',
      '2024-03-15T09:00:00',
    ]);
  });

  it('오늘 날짜 그룹의 displayLabel은 "오늘"', () => {
    const groups = groupSessionsByDate([makeSession('2024-03-15T09:00:00')], TODAY);
    expect(groups[0].displayLabel).toBe('오늘');
  });

  it('어제 날짜 그룹의 displayLabel은 "어제"', () => {
    const groups = groupSessionsByDate([makeSession('2024-03-14T09:00:00')], TODAY);
    expect(groups[0].displayLabel).toBe('어제');
  });

  it('오늘/어제가 아닌 날짜는 "M월 D일 (요일)" 형식으로 표시', () => {
    const groups = groupSessionsByDate([makeSession('2024-03-01T09:00:00')], TODAY);
    expect(groups[0].displayLabel).toBe('3월 1일 (금)');
  });

  it('각 그룹의 totalFocusSeconds는 해당 날짜 세션들의 focusSeconds 합', () => {
    const sessions = [
      makeSession('2024-03-15T09:00:00', 600),
      makeSession('2024-03-15T14:00:00', 900),
    ];
    const groups = groupSessionsByDate(sessions, TODAY);
    expect(groups[0].totalFocusSeconds).toBe(1500);
  });

  it('자정을 걸친 세션도 startedAt 기준 로컬 날짜로 그룹화됨', () => {
    const session = makeSession('2024-03-10T23:50:00', 1200); // endedAt은 다음날 00:10
    const groups = groupSessionsByDate([session], TODAY);
    expect(groups).toHaveLength(1);
    expect(groups[0].dateKey).toBe('2024-03-10');
  });

  it('ref를 생략하면 현재 시각 기준으로 오늘/어제를 판단', () => {
    vi.useFakeTimers();
    vi.setSystemTime(TODAY);
    const groups = groupSessionsByDate([makeSession('2024-03-15T09:00:00')]);
    expect(groups[0].displayLabel).toBe('오늘');
    vi.useRealTimers();
  });
});

describe('getSessionsForDate', () => {
  it('해당 날짜의 세션만 반환', () => {
    const sessions = [
      makeSession('2024-03-15T09:00:00'),
      makeSession('2024-03-16T09:00:00'),
      makeSession('2024-03-15T20:00:00'),
    ];
    const result = getSessionsForDate(sessions, new Date('2024-03-15T00:00:00'));
    expect(result.map((s) => s.startedAt)).toEqual(['2024-03-15T09:00:00', '2024-03-15T20:00:00']);
  });

  it('다른 날짜 경계값(자정 직전/직후)은 포함하지 않음', () => {
    const sessions = [makeSession('2024-03-14T23:59:59'), makeSession('2024-03-16T00:00:00')];
    const result = getSessionsForDate(sessions, new Date('2024-03-15T12:00:00'));
    expect(result).toEqual([]);
  });

  it('해당 날짜 세션이 없으면 빈 배열 반환', () => {
    expect(getSessionsForDate([], new Date('2024-03-15T12:00:00'))).toEqual([]);
  });
});

describe('getSessionOrdinalTitle', () => {
  it('"M월 D일 N번째 기록" 형식으로 반환', () => {
    expect(getSessionOrdinalTitle('2024-03-15T09:00:00', 2)).toBe('3월 15일 3번째 기록');
  });

  it('chronologicalIndex는 0-based이므로 +1되어 표시됨', () => {
    expect(getSessionOrdinalTitle('2024-03-15T09:00:00', 0)).toBe('3월 15일 1번째 기록');
  });
});

describe('formatCount', () => {
  it('천 단위마다 콤마를 넣음', () => {
    expect(formatCount(999)).toBe('999');
    expect(formatCount(10087)).toBe('10,087');
  });
});

describe('formatDuration', () => {
  it('60초 미만이면 "N초"로 표시', () => {
    expect(formatDuration(45)).toBe('45초');
  });

  it('정확히 0초면 "0초"로 표시', () => {
    expect(formatDuration(0)).toBe('0초');
  });

  it('정확히 60초면 "1분"으로 표시 (초 단위 아님)', () => {
    expect(formatDuration(60)).toBe('1분');
  });

  it('60분 미만이면 "N분"으로 표시', () => {
    expect(formatDuration(1500)).toBe('25분');
  });

  it('정확히 60분(3600초)이면 "1시간"으로 표시 (분 없이)', () => {
    expect(formatDuration(3600)).toBe('1시간');
  });

  it('시간과 분이 모두 있으면 "N시간 M분"으로 표시', () => {
    expect(formatDuration(5460)).toBe('1시간 31분');
  });

  it('24시간 미만은 시간 단위로 표시', () => {
    expect(formatDuration(23 * 3600 + 59 * 60)).toBe('23시간 59분');
  });

  it('24시간 이상이면 일과 시간으로 표시하고 분은 생략', () => {
    expect(formatDuration(25 * 3600 + 30 * 60)).toBe('1일 1시간');
    expect(formatDuration(140 * 3600 + 30 * 60)).toBe('5일 20시간');
  });

  it('시간이 딱 떨어지는 일 단위면 "N일"로 표시', () => {
    expect(formatDuration(24 * 3600)).toBe('1일');
    expect(formatDuration(24 * 3600 + 30 * 60)).toBe('1일');
  });
});

describe('formatTimeRange', () => {
  it('"HH:mm — HH:mm" 형식(24시간제)으로 반환', () => {
    expect(formatTimeRange('2024-03-15T09:00:00', '2024-03-15T14:30:00')).toBe('09:00 — 14:30');
  });

  it('오전/오후 표시 없이 24시간제로 표시됨', () => {
    expect(formatTimeRange('2024-03-15T23:00:00', '2024-03-15T23:30:00')).toBe('23:00 — 23:30');
  });
});

describe('formatFullDate', () => {
  it('"YYYY년 M월 D일" 형식으로 반환', () => {
    expect(formatFullDate('2024-03-15T09:00:00')).toBe('2024년 3월 15일');
  });
});

describe('formatFocusPeriodRanges', () => {
  function period(start: string, end: string): FocusPeriod {
    return { start, end };
  }

  it('빈 배열이면 빈 문자열 반환', () => {
    expect(formatFocusPeriodRanges([])).toBe('');
  });

  it('구간이 하나면 해당 구간의 시간 범위만 반환', () => {
    const periods = [period('2024-03-15T09:00:00', '2024-03-15T09:25:00')];
    expect(formatFocusPeriodRanges(periods)).toBe('09:00 — 09:25');
  });

  it('구간이 여러 개면 쉼표로 이어붙임', () => {
    const periods = [
      period('2024-03-15T09:00:00', '2024-03-15T09:05:00'),
      period('2024-03-15T18:00:00', '2024-03-15T18:23:00'),
    ];
    expect(formatFocusPeriodRanges(periods)).toBe('09:00 — 09:05, 18:00 — 18:23');
  });

  it('120분을 초과하는 구간은 120분으로 잘려서 표시됨', () => {
    const periods = [period('2024-03-15T09:00:00', '2024-03-15T15:00:00')];
    expect(formatFocusPeriodRanges(periods)).toBe('09:00 — 11:00');
  });

  it('구간이 maxShown 이하면 전부 표시하고 "외 N개"는 붙지 않음', () => {
    const periods = [
      period('2024-03-15T09:00:00', '2024-03-15T09:05:00'),
      period('2024-03-15T10:00:00', '2024-03-15T10:05:00'),
    ];
    expect(formatFocusPeriodRanges(periods, 2)).toBe('09:00 — 09:05, 10:00 — 10:05');
  });

  it('구간이 maxShown을 초과하면 앞쪽만 보여주고 나머지는 "외 N개"로 축약됨', () => {
    const periods = [
      period('2024-03-15T09:00:00', '2024-03-15T09:05:00'),
      period('2024-03-15T10:00:00', '2024-03-15T10:05:00'),
      period('2024-03-15T11:00:00', '2024-03-15T11:05:00'),
      period('2024-03-15T12:00:00', '2024-03-15T12:05:00'),
      period('2024-03-15T13:00:00', '2024-03-15T13:05:00'),
    ];
    expect(formatFocusPeriodRanges(periods, 2)).toBe('09:00 — 09:05, 10:00 — 10:05 외 3개');
  });
});

describe('formatSessionTimeSummary', () => {
  it('구간이 1개 이하면 formatTimeRange와 동일하게 표시', () => {
    const result = formatSessionTimeSummary('2024-03-15T09:00:00', '2024-03-15T09:25:00', [
      { start: '2024-03-15T09:00:00', end: '2024-03-15T09:25:00' },
    ]);
    expect(result).toBe('09:00 — 09:25');
  });

  it('구간 사이 간격이 휴식 시간 상한을 넘으면 전체 범위 뒤에 구간 수가 붙음', () => {
    const focusPeriods: FocusPeriod[] = [
      { start: '2024-03-15T12:00:00', end: '2024-03-15T12:05:00' },
      { start: '2024-03-15T18:00:00', end: '2024-03-15T18:23:00' },
    ];
    const result = formatSessionTimeSummary(
      '2024-03-15T12:00:00',
      '2024-03-15T18:23:00',
      focusPeriods,
    );
    expect(result).toBe('12:00 — 18:23 · 2구간');
  });

  it('정상적인 다사이클 세션(구간 사이 간격이 휴식 시간 이내)은 마커가 붙지 않음', () => {
    const focusPeriods: FocusPeriod[] = [
      { start: '2024-03-15T09:00:00', end: '2024-03-15T09:25:00' },
      { start: '2024-03-15T09:30:00', end: '2024-03-15T09:55:00' },
      { start: '2024-03-15T10:00:00', end: '2024-03-15T10:25:00' },
      { start: '2024-03-15T10:30:00', end: '2024-03-15T10:55:00' },
    ];
    const result = formatSessionTimeSummary(
      '2024-03-15T09:00:00',
      '2024-03-15T10:55:00',
      focusPeriods,
    );
    expect(result).toBe('09:00 — 10:55');
  });
});

describe('hasAbnormalFocusGap', () => {
  it('구간이 0~1개면 false', () => {
    expect(hasAbnormalFocusGap([])).toBe(false);
    expect(
      hasAbnormalFocusGap([{ start: '2024-03-15T09:00:00', end: '2024-03-15T09:25:00' }]),
    ).toBe(false);
  });

  it('구간 사이 간격이 휴식 시간 상한(60분) 이내면 false', () => {
    const periods: FocusPeriod[] = [
      { start: '2024-03-15T09:00:00', end: '2024-03-15T09:25:00' },
      { start: '2024-03-15T10:25:00', end: '2024-03-15T10:50:00' }, // 60분 간격
    ];
    expect(hasAbnormalFocusGap(periods)).toBe(false);
  });

  it('구간 사이 간격이 휴식 시간 상한을 넘으면 true', () => {
    const periods: FocusPeriod[] = [
      { start: '2024-03-15T09:00:00', end: '2024-03-15T09:25:00' },
      { start: '2024-03-15T10:25:01', end: '2024-03-15T10:50:00' }, // 60분 1초 간격
    ];
    expect(hasAbnormalFocusGap(periods)).toBe(true);
  });
});

describe('formatSessionProgressLabel', () => {
  it('pomodoro 모드는 "완료된 사이클 X / Y" 형식', () => {
    expect(
      formatSessionProgressLabel('pomodoro', { cycleCount: 2, totalCycles: 4, focusSeconds: 3000 }),
    ).toBe('완료된 사이클 2 / 4');
  });

  it('free 모드는 "자유 집중 Nm" 형식 (formatDuration 재사용)', () => {
    expect(
      formatSessionProgressLabel('free', { cycleCount: 0, totalCycles: 0, focusSeconds: 90 }),
    ).toBe('자유 집중 1분');
  });
});

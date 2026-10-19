import { describe, it, expect } from 'vitest';
import { buildSessionRecord } from './sessionRecord';

const T0 = new Date('2026-01-01T00:00:00.000Z').getTime();
const timer = {
  mode: 'pomodoro' as const,
  cycleCount: 2,
  settings: { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 4 },
  sessionStartedAt: T0,
  sessionEndedAt: T0 + 60 * 60 * 1000,
  accFocusSeconds: 50 * 60,
  rawFocusPeriods: [
    { start: T0, end: T0 + 25 * 60 * 1000 },
    { start: T0 + 30 * 60 * 1000, end: T0 + 55 * 60 * 1000 },
  ],
};
const input = {
  taskId: 't1',
  note: '  메모  ',
  focusRating: 3 as const,
  distractionTags: ['phone'],
};

describe('buildSessionRecord', () => {
  it('타이머 상태로 기록을 만들고 경과 시간에서 집중 시간을 뺀 값을 일시정지로 계산함', () => {
    expect(buildSessionRecord(timer, input)).toEqual({
      taskId: 't1',
      title: null,
      mode: 'pomodoro',
      startedAt: '2026-01-01T00:00:00.000Z',
      endedAt: '2026-01-01T01:00:00.000Z',
      completedCycles: 2,
      totalCycles: 4,
      focusSeconds: 3000,
      pausedSeconds: 600,
      focusPeriods: [
        { start: '2026-01-01T00:00:00.000Z', end: '2026-01-01T00:25:00.000Z' },
        { start: '2026-01-01T00:30:00.000Z', end: '2026-01-01T00:55:00.000Z' },
      ],
      note: '메모',
      focusRating: 3,
      distractionTags: ['phone'],
    });
  });

  it('자유 모드면 사이클 수가 0, 빈 메모는 null', () => {
    const record = buildSessionRecord({ ...timer, mode: 'free' }, { ...input, note: '  ' });
    expect(record.completedCycles).toBe(0);
    expect(record.totalCycles).toBe(0);
    expect(record.note).toBeNull();
  });
});

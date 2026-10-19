import { describe, expect, it } from 'vitest';
import { getPhaseEndSchedule } from './phaseEndSchedule';

const T0 = new Date('2024-01-01T00:00:00.000Z').getTime();
const MIN = 60 * 1000;

describe('getPhaseEndSchedule', () => {
  it('집중부터 마지막 집중까지 남은 페이즈 종료 시각을 모두 반환', () => {
    const alerts = getPhaseEndSchedule({
      phase: 'focus',
      cycleCount: 0,
      startedAt: T0,
      remainingSeconds: 25 * 60,
      settings: { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 2 },
    });

    expect(alerts.map((a) => a.at)).toEqual([T0 + 25 * MIN, T0 + 30 * MIN, T0 + 55 * MIN]);
    expect(alerts.map((a) => a.title)).toEqual(['집중 시간 종료!', '휴식 종료!', '타이머 완료!']);
  });

  it('일시정지 후 재개하면 남은 시간 기준으로 계산', () => {
    const alerts = getPhaseEndSchedule({
      phase: 'focus',
      cycleCount: 1,
      startedAt: T0,
      remainingSeconds: 10 * 60,
      settings: { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 2 },
    });

    expect(alerts.map((a) => a.at)).toEqual([T0 + 10 * MIN]);
  });

  it('휴식 중이면 휴식 종료부터 시작', () => {
    const alerts = getPhaseEndSchedule({
      phase: 'short-break',
      cycleCount: 1,
      startedAt: T0,
      remainingSeconds: 5 * 60,
      settings: { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 2 },
    });

    expect(alerts.map((a) => a.at)).toEqual([T0 + 5 * MIN, T0 + 30 * MIN]);
  });

  it('휴식이 0분이면 휴식 알림 없이 집중 종료만 이어짐', () => {
    const alerts = getPhaseEndSchedule({
      phase: 'focus',
      cycleCount: 0,
      startedAt: T0,
      remainingSeconds: 25 * 60,
      settings: { focusMinutes: 25, shortBreakMinutes: 0, totalCycles: 3 },
    });

    expect(alerts.map((a) => a.at)).toEqual([T0 + 25 * MIN, T0 + 50 * MIN, T0 + 75 * MIN]);
    expect(alerts.map((a) => a.title)).toEqual(['사이클 완료!', '사이클 완료!', '타이머 완료!']);
  });
});

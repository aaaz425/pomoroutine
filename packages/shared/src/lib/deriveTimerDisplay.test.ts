import { describe, expect, it } from 'vitest';
import { deriveTimerDisplay } from './deriveTimerDisplay';

const NOW = new Date('2024-01-01T00:10:00.000Z').getTime();

describe('deriveTimerDisplay', () => {
  it('pomodoro 실행 중 — 경과 시간만큼 remainingSeconds가 감소', () => {
    const startedAt = NOW - 10_000; // 10초 경과
    const result = deriveTimerDisplay({
      phase: 'focus',
      mode: 'pomodoro',
      remainingSeconds: 25 * 60,
      startedAt,
      accFocusSeconds: 0,
      cycleCount: 0,
      focusMinutes: 25,
      now: NOW,
    });

    expect(result.isRunning).toBe(true);
    expect(result.displaySeconds).toBe(25 * 60 - 10);
    expect(result.justCompleted).toBe(false);
  });

  it('pomodoro 일시정지 중 — remainingSeconds 값을 그대로 사용', () => {
    const result = deriveTimerDisplay({
      phase: 'focus',
      mode: 'pomodoro',
      remainingSeconds: 100,
      startedAt: null,
      accFocusSeconds: 0,
      cycleCount: 0,
      focusMinutes: 25,
      now: NOW,
    });

    expect(result.isRunning).toBe(false);
    expect(result.displaySeconds).toBe(100);
    expect(result.justCompleted).toBe(false);
  });

  it('free 모드 실행 중 — accFocusSeconds + 경과로 카운트업', () => {
    const startedAt = NOW - 15_000;
    const result = deriveTimerDisplay({
      phase: 'focus',
      mode: 'free',
      remainingSeconds: 25 * 60,
      startedAt,
      accFocusSeconds: 100,
      cycleCount: 0,
      focusMinutes: 25,
      now: NOW,
    });

    expect(result.displaySeconds).toBe(115);
    expect(result.justCompleted).toBe(false); // free 모드는 자동 완료 없음
  });

  it('free 모드 일시정지 중 — accFocusSeconds 값을 그대로 사용', () => {
    const result = deriveTimerDisplay({
      phase: 'focus',
      mode: 'free',
      remainingSeconds: 25 * 60,
      startedAt: null,
      accFocusSeconds: 100,
      cycleCount: 0,
      focusMinutes: 25,
      now: NOW,
    });

    expect(result.displaySeconds).toBe(100);
  });

  it('pomodoro 실행 중 예정 종료를 지나면 0에서 멈추고 완료와 지난 시간을 반환', () => {
    const result = deriveTimerDisplay({
      phase: 'focus',
      mode: 'pomodoro',
      remainingSeconds: 60,
      startedAt: NOW - 100_000,
      accFocusSeconds: 0,
      cycleCount: 0,
      focusMinutes: 25,
      now: NOW,
    });

    expect(result.displaySeconds).toBe(0);
    expect(result.justCompleted).toBe(true);
    expect(result.overdueSeconds).toBe(40);
  });
});

import type { TimerMode, TimerPhase } from '../types/timer';
import { deriveElapsedMinutes } from './deriveElapsedMinutes';

export interface DeriveTimerDisplayInput {
  phase: TimerPhase;
  mode: TimerMode;
  remainingSeconds: number;
  startedAt: number | null;
  accFocusSeconds: number;
  cycleCount: number;
  focusMinutes: number;
  now: number; // 호출 측에서 Date.now()를 주입 — 순수 함수로 유지해 테스트 용이
}

export interface TimerDisplayState {
  displaySeconds: number;
  isRunning: boolean;
  justCompleted: boolean; // pomodoro 모드에서 remaining이 0에 도달한 tick 1회에서만 true
  overdueSeconds: number;
  elapsedMinutes: number;
}

export function deriveTimerDisplay(input: DeriveTimerDisplayInput): TimerDisplayState {
  const {
    phase,
    mode,
    remainingSeconds,
    startedAt,
    accFocusSeconds,
    cycleCount,
    focusMinutes,
    now,
  } = input;
  const isRunning = startedAt !== null;
  const elapsed = isRunning ? Math.floor((now - startedAt!) / 1000) : 0;

  let displaySeconds: number;
  let justCompleted = false;
  let overdueSeconds = 0;

  if (mode === 'free') {
    displaySeconds = isRunning ? accFocusSeconds + elapsed : accFocusSeconds;
  } else {
    const runningRemaining = Math.max(0, remainingSeconds - elapsed);
    displaySeconds = isRunning ? runningRemaining : remainingSeconds;
    justCompleted = isRunning && runningRemaining === 0;
    overdueSeconds = isRunning ? Math.max(0, elapsed - remainingSeconds) : 0;
  }

  const elapsedMinutes = deriveElapsedMinutes({
    mode,
    displaySeconds,
    cycleCount,
    focusMinutes,
    phase,
  });

  return { displaySeconds, isRunning, justCompleted, overdueSeconds, elapsedMinutes };
}

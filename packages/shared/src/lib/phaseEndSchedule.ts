import type { TimerPhase, TimerSettings } from '../types/timer';
import { getPhaseEndMessage } from './phaseEndMessage';

export interface PhaseEndScheduleInput {
  phase: TimerPhase;
  cycleCount: number;
  startedAt: number;
  remainingSeconds: number;
  settings: TimerSettings;
}

export interface PhaseEndAlert {
  at: number; // epoch ms
  title: string;
  body: string;
}

export function getPhaseEndSchedule({
  phase,
  cycleCount,
  startedAt,
  remainingSeconds,
  settings,
}: PhaseEndScheduleInput): PhaseEndAlert[] {
  const { focusMinutes, shortBreakMinutes, totalCycles } = settings;
  const alerts: PhaseEndAlert[] = [];
  let currentPhase = phase;
  let cycles = cycleCount;
  let at = startedAt + remainingSeconds * 1000;

  while (true) {
    alerts.push({
      at,
      ...getPhaseEndMessage({
        phase: currentPhase,
        cycleCount: cycles,
        totalCycles,
        shortBreakMinutes,
      }),
    });
    if (currentPhase === 'short-break') {
      currentPhase = 'focus';
      at += focusMinutes * 60 * 1000;
      continue;
    }
    cycles += 1;
    if (cycles >= totalCycles) return alerts;
    currentPhase = shortBreakMinutes === 0 ? 'focus' : 'short-break';
    at += (currentPhase === 'focus' ? focusMinutes : shortBreakMinutes) * 60 * 1000;
  }
}

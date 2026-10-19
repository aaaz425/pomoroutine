import type { FocusPeriod, TimerMode } from './timer';

export type FocusRating = 1 | 2 | 3;

export interface Session {
  id: string;
  taskId: string | null;
  title: string | null;
  mode: TimerMode;
  startedAt: string; // ISO 8601
  endedAt: string; // ISO 8601
  completedCycles: number;
  totalCycles: number;
  focusSeconds: number;
  pausedSeconds: number;
  focusPeriods: FocusPeriod[];
  note: string | null;
  focusRating: FocusRating | null;
  distractionTags: string[];
}

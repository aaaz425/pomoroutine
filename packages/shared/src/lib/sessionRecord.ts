import type { FocusRating, Session } from '../types/session';
import type { TimerSnapshot } from '../store/timerStore';
import { normalizeFocusPeriods } from './focusPeriods';

type EndedTimer = Pick<
  TimerSnapshot,
  'mode' | 'cycleCount' | 'settings' | 'sessionStartedAt' | 'accFocusSeconds' | 'rawFocusPeriods'
> & { sessionEndedAt: number };

interface RecordInput {
  taskId: string | null;
  note: string;
  focusRating: FocusRating | null;
  distractionTags: string[];
}

export function buildSessionRecord(timer: EndedTimer, input: RecordInput): Omit<Session, 'id'> {
  const endedAt = timer.sessionEndedAt;
  const startedAt = timer.sessionStartedAt ?? endedAt;
  const totalElapsed = timer.sessionStartedAt
    ? Math.floor((endedAt - timer.sessionStartedAt) / 1000)
    : timer.accFocusSeconds;
  const isFree = timer.mode === 'free';
  return {
    taskId: input.taskId,
    title: null,
    mode: timer.mode,
    startedAt: new Date(startedAt).toISOString(),
    endedAt: new Date(endedAt).toISOString(),
    completedCycles: isFree ? 0 : timer.cycleCount,
    totalCycles: isFree ? 0 : timer.settings.totalCycles,
    focusSeconds: timer.accFocusSeconds,
    pausedSeconds: Math.max(0, totalElapsed - timer.accFocusSeconds),
    focusPeriods: normalizeFocusPeriods(
      timer.rawFocusPeriods.map((p) => ({
        start: new Date(p.start).toISOString(),
        end: new Date(p.end).toISOString(),
      })),
    ),
    note: input.note.trim() || null,
    focusRating: input.focusRating,
    distractionTags: input.distractionTags,
  };
}

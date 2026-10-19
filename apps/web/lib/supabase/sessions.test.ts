import { describe, it, expect } from 'vitest';
import { toSession } from '@/lib/supabase/sessions';

const validRow = {
  id: 's1',
  task_id: 't1',
  title: null,
  mode: 'pomodoro',
  started_at: '2026-01-01T09:00:00.000Z',
  ended_at: '2026-01-01T09:30:00.000Z',
  completed_cycles: 1,
  total_cycles: 4,
  focus_seconds: 1500,
  paused_seconds: 0,
  focus_periods: [{ start: '2026-01-01T09:00:00.000Z', end: '2026-01-01T09:25:00.000Z' }],
  note: '집중 잘됨',
  focus_rating: 3,
  distraction_tags: ['phone'],
};

describe('toSession', () => {
  it('유효한 row를 camelCase Session으로 변환함', () => {
    expect(toSession(validRow)).toEqual({
      id: 's1',
      taskId: 't1',
      title: null,
      mode: 'pomodoro',
      startedAt: '2026-01-01T09:00:00.000Z',
      endedAt: '2026-01-01T09:30:00.000Z',
      completedCycles: 1,
      totalCycles: 4,
      focusSeconds: 1500,
      pausedSeconds: 0,
      focusPeriods: [{ start: '2026-01-01T09:00:00.000Z', end: '2026-01-01T09:25:00.000Z' }],
      note: '집중 잘됨',
      focusRating: 3,
      distractionTags: ['phone'],
    });
  });

  it('검증 실패면 null', () => {
    expect(toSession({ ...validRow, focus_rating: 5 })).toBeNull();
  });
});

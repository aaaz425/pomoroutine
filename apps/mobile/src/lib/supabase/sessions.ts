import { supabase } from '@/lib/supabase/client';
import type { Session } from '@pomoroutine/shared';

export async function insertSession(input: Omit<Session, 'id'>): Promise<{ error: boolean }> {
  const { error } = await supabase.from('sessions').insert({
    task_id: input.taskId,
    title: input.title,
    mode: input.mode,
    started_at: input.startedAt,
    ended_at: input.endedAt,
    completed_cycles: input.completedCycles,
    total_cycles: input.totalCycles,
    focus_seconds: input.focusSeconds,
    paused_seconds: input.pausedSeconds,
    focus_periods: input.focusPeriods,
    note: input.note,
    focus_rating: input.focusRating,
    distraction_tags: input.distractionTags,
  });
  return { error: error !== null };
}

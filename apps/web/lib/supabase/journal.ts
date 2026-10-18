import { createClient } from '@/lib/supabase/client';
import { JournalSummarySchema, type JournalSummary } from '@/types';

export async function fetchJournalSummary(): Promise<JournalSummary | null> {
  const supabase = createClient();
  const { data, error } = await supabase.rpc('get_journal_summary');
  if (error || !data) return null;
  const parsed = JournalSummarySchema.safeParse(data);
  return parsed.success ? parsed.data : null;
}

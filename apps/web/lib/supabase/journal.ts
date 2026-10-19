import { createClient } from '@/lib/supabase/client';
import { JournalSummarySchema, type JournalSummary } from '@/types';

export async function fetchJournalSummary(): Promise<JournalSummary> {
  const { data, error } = await createClient().rpc('get_journal_summary');
  if (error) throw error;
  return JournalSummarySchema.parse(data);
}

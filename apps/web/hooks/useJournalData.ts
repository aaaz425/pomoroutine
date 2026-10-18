'use client';

import { useQuery } from '@tanstack/react-query';
import { startOfDay, subDays } from 'date-fns';
import { sessionKeys } from '@/lib/query/keys';
import { fetchJournalSummary } from '@/lib/supabase/journal';
import { fetchInsightSessions } from '@/lib/supabase/sessions';

const INSIGHT_WINDOW_DAYS = 30;

export function useJournalData() {
  const insightStartIso = subDays(startOfDay(new Date()), INSIGHT_WINDOW_DAYS - 1).toISOString();

  const summary = useQuery({
    queryKey: sessionKeys.journalSummary,
    queryFn: async () => {
      const result = await fetchJournalSummary();
      if (!result) throw new Error('journal summary fetch failed');
      return result;
    },
  });

  const insightSessions = useQuery({
    queryKey: sessionKeys.insights(insightStartIso),
    queryFn: async () => {
      const result = await fetchInsightSessions(insightStartIso);
      if (!result) throw new Error('insight sessions fetch failed');
      return result;
    },
  });

  return {
    summary: summary.data,
    insightSessions: insightSessions.data,
    isError: summary.isError || insightSessions.isError,
    refetch: () => {
      void summary.refetch();
      void insightSessions.refetch();
    },
  };
}

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
    queryFn: fetchJournalSummary,
  });

  const insightSessions = useQuery({
    queryKey: sessionKeys.insights(insightStartIso),
    queryFn: () => fetchInsightSessions(insightStartIso),
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

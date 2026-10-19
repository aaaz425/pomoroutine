'use client';

import { useQuery } from '@tanstack/react-query';
import { getDashboardRange } from '@/lib/dashboard';
import { sessionKeys } from '@/lib/query/keys';
import { fetchDashboardSummary } from '@/lib/supabase/dashboard';
import { fetchDashboardSessions } from '@/lib/supabase/sessions';

export function useDashboardData() {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const { startIso, endIso } = getDashboardRange();

  const summary = useQuery({
    queryKey: sessionKeys.summary(timezone),
    queryFn: () => fetchDashboardSummary(timezone),
  });

  const periodSessions = useQuery({
    queryKey: sessionKeys.range(startIso, endIso),
    queryFn: () => fetchDashboardSessions(startIso, endIso),
  });

  return {
    summary: summary.data,
    periodSessions: periodSessions.data,
    isError: summary.isError || periodSessions.isError,
    refetch: () => {
      void summary.refetch();
      void periodSessions.refetch();
    },
  };
}

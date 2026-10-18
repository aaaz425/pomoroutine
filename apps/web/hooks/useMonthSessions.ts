'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionKeys } from '@/lib/query/keys';
import { fetchSessionsInRange } from '@/lib/supabase/sessions';
import { getMonthRange } from '@/lib/sessionUtils';

export function useMonthSessions(viewedMonth: Date) {
  const { startIso, endIso } = getMonthRange(viewedMonth.getFullYear(), viewedMonth.getMonth());

  const query = useQuery({
    queryKey: sessionKeys.month(startIso),
    queryFn: async () => {
      const result = await fetchSessionsInRange(startIso, endIso);
      if (!result) throw new Error('month sessions fetch failed');
      return result.sessions;
    },
  });

  return {
    items: query.data ?? [],
    isPending: query.isPending,
    isError: query.isError,
    refetch: () => void query.refetch(),
  };
}

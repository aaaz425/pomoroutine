'use client';

import { useQuery } from '@tanstack/react-query';
import { sessionKeys } from '@/lib/query/keys';
import { fetchSessionStartTimes } from '@/lib/supabase/sessions';
import { getMonthRange, toLocalDateKey } from '@/lib/sessionUtils';

export function useMarkedDates(visibleMonth: { year: number; month: number } | null) {
  const range = visibleMonth ? getMonthRange(visibleMonth.year, visibleMonth.month - 1) : null;

  const query = useQuery({
    queryKey: sessionKeys.markedDates(range?.startIso ?? ''),
    enabled: range !== null,
    queryFn: async () => {
      const result = await fetchSessionStartTimes(range!.startIso, range!.endIso);
      if (!result) throw new Error('marked dates fetch failed');
      return result;
    },
  });

  return new Set((query.data ?? []).map(toLocalDateKey));
}

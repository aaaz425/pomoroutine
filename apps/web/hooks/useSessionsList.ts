'use client';

import { useInfiniteQuery } from '@tanstack/react-query';
import { SESSION_LIMITS } from '@/lib/constants/limits';
import { sessionKeys } from '@/lib/query/keys';
import { fetchSessionsPage } from '@/lib/supabase/sessions';
import { getDateFilterRange } from '@/lib/sessionUtils';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import type { SessionListFilters } from '@/types';

const SEARCH_DEBOUNCE_MS = 300;

export function useSessionsList(filters: SessionListFilters) {
  const search = useDebouncedValue(filters.search.trim(), SEARCH_DEBOUNCE_MS);
  const keyFilters = { ...filters, search };

  const query = useInfiniteQuery({
    queryKey: sessionKeys.list(keyFilters),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const { startIso, endIso } = getDateFilterRange(filters.dateFrom, filters.dateTo);
      const result = await fetchSessionsPage({
        cursor: pageParam,
        limit: SESSION_LIMITS.JOURNAL_PAGE_SIZE,
        categoryIds: filters.categoryIds,
        search,
        startIso,
        endIso,
        withCount: pageParam === null,
      });
      if (!result) throw new Error('sessions page fetch failed');
      return result;
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });

  return {
    items: query.data?.pages.flatMap((page) => page.sessions) ?? [],
    totalCount: query.data?.pages[0]?.totalCount ?? null,
    isPending: query.isPending,
    isError: query.isError,
    hasMore: query.hasNextPage,
    isFetchingMore: query.isFetchingNextPage,
    loadMore: () => void query.fetchNextPage(),
    refetch: () => void query.refetch(),
  };
}

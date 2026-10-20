import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { TOAST_MESSAGES } from '@/lib/constants/messages';
import { QUERY_STALE_MS } from '@/lib/constants/ux';

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (query.state.data !== undefined) toast(TOAST_MESSAGES.dataRefreshFailed);
      },
    }),
    defaultOptions: {
      queries: { staleTime: QUERY_STALE_MS, refetchOnWindowFocus: 'always', retry: 1 },
    },
  });
}

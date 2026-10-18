import { QueryCache, QueryClient } from '@tanstack/react-query';
import { toast } from '@/lib/toast';
import { TOAST_MESSAGES } from '@/lib/constants/messages';

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (query.state.data !== undefined) toast(TOAST_MESSAGES.dataRefreshFailed);
      },
    }),
    defaultOptions: {
      queries: { staleTime: 0, refetchOnWindowFocus: true, retry: 1 },
    },
  });
}

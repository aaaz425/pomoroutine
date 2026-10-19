import { AppState } from 'react-native';
import { focusManager, QueryCache, QueryClient } from '@tanstack/react-query';
import { TOAST_MESSAGES } from '@pomoroutine/shared';
import { toast } from '@/lib/toast';

focusManager.setEventListener((handleFocus) => {
  const subscription = AppState.addEventListener('change', (state) =>
    handleFocus(state === 'active'),
  );
  return () => subscription.remove();
});

export function createQueryClient() {
  return new QueryClient({
    queryCache: new QueryCache({
      onError: (_error, query) => {
        if (query.state.data !== undefined) toast(TOAST_MESSAGES.dataRefreshFailed);
      },
    }),
    defaultOptions: {
      queries: { retry: 2, retryDelay: 700 },
    },
  });
}

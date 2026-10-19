import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { QUERY_KEYS, type AppSettings } from '@pomoroutine/shared';
import { createTimerStore, preloadTimerSnapshot } from '@/store/timerStore';
import { createQueryClient } from '@/lib/query/client';
import { taskQueries } from '@/lib/query/tasks';
import { settingsQuery } from '@/lib/query/settings';
import type { TimerStoreApi, TimerStore } from '@/store/timerStore';

const TimerStoreContext = createContext<TimerStoreApi | null>(null);

export function useTimerStore<T>(selector: (state: TimerStore) => T): T {
  const store = useContext(TimerStoreContext);
  if (!store) throw new Error('useTimerStore must be used within StoreProvider');
  return useStore(store, selector);
}

// Supabase 조회가 끝나기 전엔 화면별 스켈레톤을 보여주기 위한 플래그
const HydrationContext = createContext(false);

export function useHydrated(): boolean {
  return useContext(HydrationContext);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [timerStore] = useState<TimerStoreApi>(createTimerStore);
  const [queryClient] = useState<QueryClient>(createQueryClient);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      preloadTimerSnapshot().then(() => timerStore.getState().hydrate()),
      queryClient.prefetchQuery(taskQueries.tasks),
      queryClient.prefetchQuery(taskQueries.categories),
      queryClient.prefetchQuery(settingsQuery),
    ]).finally(() => setHydrated(true));
  }, [timerStore, queryClient]);

  useEffect(() => {
    let synced: AppSettings['defaultTimerSettings'] | null = null;
    return queryClient.getQueryCache().subscribe(({ query }) => {
      if (query.queryKey[0] !== QUERY_KEYS.settings[0]) return;
      const defaults = (query.state.data as AppSettings | undefined)?.defaultTimerSettings;
      if (!defaults || defaults === synced) return;
      synced = defaults;
      timerStore.getState().syncDefaultSettings(defaults);
    });
  }, [queryClient, timerStore]);

  return (
    <QueryClientProvider client={queryClient}>
      <TimerStoreContext.Provider value={timerStore}>
        <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
      </TimerStoreContext.Provider>
    </QueryClientProvider>
  );
}

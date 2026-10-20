import { createContext, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { subscribeTimerDefaults } from '@pomoroutine/shared';
import { createTimerStore, preloadTimerSnapshot } from '@/store/timerStore';
import { createQueryClient } from '@/lib/query/client';
import { taskQueries } from '@/lib/query/tasks';
import { settingsQuery } from '@/lib/query/settings';
import type { TimerStoreApi, TimerStore } from '@/store/timerStore';

const TimerStoreContext = createContext<TimerStoreApi | null>(null);

export function useTimerStoreApi(): TimerStoreApi {
  const store = useContext(TimerStoreContext);
  if (!store) throw new Error('useTimerStore must be used within StoreProvider');
  return store;
}

export function useTimerStore<T>(selector: (state: TimerStore) => T): T {
  return useStore(useTimerStoreApi(), selector);
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

  useEffect(() => subscribeTimerDefaults(queryClient, timerStore), [queryClient, timerStore]);

  return (
    <QueryClientProvider client={queryClient}>
      <TimerStoreContext.Provider value={timerStore}>
        <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
      </TimerStoreContext.Provider>
    </QueryClientProvider>
  );
}

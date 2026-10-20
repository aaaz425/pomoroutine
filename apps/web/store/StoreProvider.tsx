'use client';

import { createContext, startTransition, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { subscribeTimerDefaults, WEBVIEW_TAB_FOCUS_EVENT } from '@pomoroutine/shared';
import { createTimerStore } from '@/store/timerStore';
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

// localStorage는 마운트 후 hydrate()로 반영 (SSR 기본값 → 실제 저장값)
const HydrationContext = createContext(false);

export function useHydrated(): boolean {
  return useContext(HydrationContext);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState<QueryClient>(createQueryClient);
  const [timerStore] = useState<TimerStoreApi>(createTimerStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    timerStore.getState().hydrate();
    Promise.all([
      queryClient.prefetchQuery(taskQueries.tasks),
      queryClient.prefetchQuery(taskQueries.categories),
      queryClient.prefetchQuery(settingsQuery),
    ]).finally(() => {
      startTransition(() => setHydrated(true));
    });
  }, [queryClient, timerStore]);

  useEffect(() => {
    if (!hydrated) return;
    function handleWebViewTabFocus() {
      void queryClient.refetchQueries({ type: 'active' });
    }
    window.addEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
    return () => window.removeEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
  }, [hydrated, queryClient]);

  useEffect(() => subscribeTimerDefaults(queryClient, timerStore), [queryClient, timerStore]);

  return (
    <QueryClientProvider client={queryClient}>
      <TimerStoreContext.Provider value={timerStore}>
        <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
      </TimerStoreContext.Provider>
    </QueryClientProvider>
  );
}

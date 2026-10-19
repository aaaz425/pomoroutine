'use client';

import { createContext, startTransition, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { WEBVIEW_TAB_FOCUS_EVENT } from '@pomoroutine/shared';
import { createTimerStore } from '@/store/timerStore';
import { createSettingsStore } from '@/store/settingsStore';
import { createQueryClient } from '@/lib/query/client';
import { taskQueries } from '@/lib/query/tasks';
import type { TimerStoreApi, TimerStore } from '@/store/timerStore';
import type { SettingsStoreApi, SettingsStore } from '@/store/settingsStore';

const TimerStoreContext = createContext<TimerStoreApi | null>(null);

export function useTimerStore<T>(selector: (state: TimerStore) => T): T {
  const store = useContext(TimerStoreContext);
  if (!store) throw new Error('useTimerStore must be used within StoreProvider');
  return useStore(store, selector);
}

const SettingsStoreContext = createContext<SettingsStoreApi | null>(null);

export function useSettingsStore<T>(selector: (state: SettingsStore) => T): T {
  const store = useContext(SettingsStoreContext);
  if (!store) throw new Error('useSettingsStore must be used within StoreProvider');
  return useStore(store, selector);
}

// localStorage는 마운트 후 hydrate()로 반영 (SSR 기본값 → 실제 저장값)
const HydrationContext = createContext(false);

export function useHydrated(): boolean {
  return useContext(HydrationContext);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState<QueryClient>(createQueryClient);
  const [timerStore] = useState<TimerStoreApi>(createTimerStore);
  const [settingsStore] = useState<SettingsStoreApi>(createSettingsStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    timerStore.getState().hydrate();
    Promise.all([
      queryClient.prefetchQuery(taskQueries.tasks),
      queryClient.prefetchQuery(taskQueries.categories),
      settingsStore.getState().hydrate(),
    ]).finally(() => {
      startTransition(() => setHydrated(true));
    });
  }, [queryClient, settingsStore, timerStore]);

  useEffect(() => {
    if (!hydrated) return;
    function handleVisibility() {
      if (document.visibilityState === 'visible') void settingsStore.getState().refresh();
    }
    function handleWebViewTabFocus() {
      void settingsStore.getState().refresh();
      void queryClient.refetchQueries({ type: 'active' });
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
    };
  }, [hydrated, settingsStore, queryClient]);

  useEffect(
    () =>
      settingsStore.subscribe((state, prev) => {
        if (state.defaultTimerSettings === prev.defaultTimerSettings) return;
        timerStore.getState().syncDefaultSettings(state.defaultTimerSettings);
      }),
    [timerStore, settingsStore],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <TimerStoreContext.Provider value={timerStore}>
        <SettingsStoreContext.Provider value={settingsStore}>
          <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
        </SettingsStoreContext.Provider>
      </TimerStoreContext.Provider>
    </QueryClientProvider>
  );
}

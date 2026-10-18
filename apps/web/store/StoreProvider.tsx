'use client';

import { createContext, startTransition, useContext, useEffect, useState } from 'react';
import { useStore } from 'zustand';
import { QueryClientProvider, type QueryClient } from '@tanstack/react-query';
import { WEBVIEW_TAB_FOCUS_EVENT } from '@pomoroutine/shared';
import { createTimerStore } from '@/store/timerStore';
import { createTaskStore } from '@/store/taskStore';
import { createSettingsStore } from '@/store/settingsStore';
import { createQueryClient } from '@/lib/query/client';
import { sessionKeys } from '@/lib/query/keys';
import type { TimerStoreApi, TimerStore } from '@/store/timerStore';
import type { TaskStoreApi, TaskStore } from '@/store/taskStore';
import type { SettingsStoreApi, SettingsStore } from '@/store/settingsStore';

const TimerStoreContext = createContext<TimerStoreApi | null>(null);

export function useTimerStore<T>(selector: (state: TimerStore) => T): T {
  const store = useContext(TimerStoreContext);
  if (!store) throw new Error('useTimerStore must be used within StoreProvider');
  return useStore(store, selector);
}

const TaskStoreContext = createContext<TaskStoreApi | null>(null);

export function useTaskStore<T>(selector: (state: TaskStore) => T): T {
  const store = useContext(TaskStoreContext);
  if (!store) throw new Error('useTaskStore must be used within StoreProvider');
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
  const [taskStore] = useState<TaskStoreApi>(() =>
    createTaskStore({
      onSessionsChanged: () => void queryClient.invalidateQueries({ queryKey: sessionKeys.all }),
    }),
  );
  const [settingsStore] = useState<SettingsStoreApi>(createSettingsStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    timerStore.getState().hydrate();
    // taskStore/settingsStore는 Supabase 조회라 네트워크 왕복이 있음 — 둘 다 끝난 뒤에 hydrated로 표시
    Promise.all([taskStore.getState().hydrate(), settingsStore.getState().hydrate()]).finally(
      () => {
        startTransition(() => setHydrated(true));
      },
    );
  }, [taskStore, settingsStore, timerStore]);

  useEffect(() => {
    if (!hydrated) return;
    function refresh() {
      void taskStore.getState().refresh();
      void settingsStore.getState().refresh();
    }
    function handleVisibility() {
      if (document.visibilityState === 'visible') refresh();
    }
    function handleWebViewTabFocus() {
      refresh();
      void queryClient.refetchQueries({ type: 'active' });
    }
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener(WEBVIEW_TAB_FOCUS_EVENT, handleWebViewTabFocus);
    };
  }, [hydrated, taskStore, settingsStore, queryClient]);

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
        <TaskStoreContext.Provider value={taskStore}>
          <SettingsStoreContext.Provider value={settingsStore}>
            <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
          </SettingsStoreContext.Provider>
        </TaskStoreContext.Provider>
      </TimerStoreContext.Provider>
    </QueryClientProvider>
  );
}

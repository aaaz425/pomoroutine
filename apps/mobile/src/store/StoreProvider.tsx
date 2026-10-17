import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { useStore } from 'zustand';
import { createTimerStore, preloadTimerSnapshot } from '@/store/timerStore';
import { createTaskStore } from '@/store/taskStore';
import { createSettingsStore } from '@/store/settingsStore';
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

// Supabase 조회가 끝나기 전엔 화면별 스켈레톤을 보여주기 위한 플래그
const HydrationContext = createContext(false);

export function useHydrated(): boolean {
  return useContext(HydrationContext);
}

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [timerStore] = useState<TimerStoreApi>(createTimerStore);
  const [taskStore] = useState<TaskStoreApi>(createTaskStore);
  const [settingsStore] = useState<SettingsStoreApi>(createSettingsStore);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    Promise.all([
      preloadTimerSnapshot().then(() => timerStore.getState().hydrate()),
      taskStore.getState().hydrate(),
      settingsStore.getState().hydrate(),
    ]).finally(() => setHydrated(true));
  }, [timerStore, taskStore, settingsStore]);

  useEffect(() => {
    if (!hydrated) return;
    const subscription = AppState.addEventListener('change', (state) => {
      if (state !== 'active') return;
      void taskStore.getState().refresh();
      void settingsStore.getState().refresh();
    });
    return () => subscription.remove();
  }, [hydrated, taskStore, settingsStore]);

  useEffect(
    () =>
      settingsStore.subscribe((state, prev) => {
        if (state.defaultTimerSettings === prev.defaultTimerSettings) return;
        timerStore.getState().syncDefaultSettings(state.defaultTimerSettings);
      }),
    [timerStore, settingsStore],
  );

  return (
    <TimerStoreContext.Provider value={timerStore}>
      <TaskStoreContext.Provider value={taskStore}>
        <SettingsStoreContext.Provider value={settingsStore}>
          <HydrationContext.Provider value={hydrated}>{children}</HydrationContext.Provider>
        </SettingsStoreContext.Provider>
      </TaskStoreContext.Provider>
    </TimerStoreContext.Provider>
  );
}

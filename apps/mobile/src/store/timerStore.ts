import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  ACTIVE_TIMER_STORAGE_KEY,
  ActiveTimerStateSchema,
  createTimerStore as createSharedTimerStore,
  TOAST_MESSAGES,
  type TimerSnapshot,
  type TimerStorePorts,
} from '@pomoroutine/shared';
import { toast } from '@/lib/toast';

// AsyncStorage는 비동기라 동기 loadSnapshot 시그니처에 못 꽂으므로, hydrate() 전에 preloadTimerSnapshot()으로 캐시를 미리 채운다
let cachedSnapshot: TimerSnapshot | null = null;

export async function preloadTimerSnapshot(): Promise<void> {
  try {
    const raw = await AsyncStorage.getItem(ACTIVE_TIMER_STORAGE_KEY);
    if (!raw) return;
    const parsed = ActiveTimerStateSchema.safeParse(JSON.parse(raw));
    if (parsed.success) cachedSnapshot = parsed.data;
  } catch {
    // 파싱 실패 시 캐시 없음 — hydrate()가 fallback(현재 상태)을 그대로 사용
  }
}

export const createTimerStore = () => {
  const ports: TimerStorePorts = {
    persistSnapshot: (snapshot) => {
      void AsyncStorage.setItem(ACTIVE_TIMER_STORAGE_KEY, JSON.stringify(snapshot));
    },
    loadSnapshot: (fallback) => cachedSnapshot ?? fallback,
    onSessionTooShort: () => toast(TOAST_MESSAGES.sessionTooShort),
  };
  return createSharedTimerStore(ports);
};

export type { TimerStore, TimerStoreApi } from '@pomoroutine/shared';

'use client';

import { useTaskStore } from '@/store/StoreProvider';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';

export function useSessionsHydrated() {
  const sessionsHydrated = useTaskStore((s) => s.sessionsHydrated);
  return { sessionsHydrated, showSkeleton: useDelayedFlag(!sessionsHydrated) };
}

'use client';

import { useHydrated } from '@/store/StoreProvider';
import { useDelayedFlag } from '@/hooks/useDelayedFlag';

// SKELETON_SHOW_DELAY_MS 안에 끝나면 스켈레톤을 건너뛴다 — 빠른 연결에서 한 프레임 반짝이는 것 방지
export function useDelayedHydration() {
  const hydrated = useHydrated();
  return { hydrated, showSkeleton: useDelayedFlag(!hydrated) };
}

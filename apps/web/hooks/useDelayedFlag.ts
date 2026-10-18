'use client';

import { useEffect, useState } from 'react';
import { SKELETON_SHOW_DELAY_MS } from '@/lib/constants';

export function useDelayedFlag(active: boolean, delayMs = SKELETON_SHOW_DELAY_MS) {
  const [elapsed, setElapsed] = useState(false);

  useEffect(() => {
    if (!active) return;
    const timer = setTimeout(() => setElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [active, delayMs]);

  return active && elapsed;
}

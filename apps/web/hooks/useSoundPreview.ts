'use client';

import { useEffect, useState } from 'react';
import { playAlarm, stopAlarm } from '@/lib/notifications';
import type { SoundType } from '@/types';

export function useSoundPreview(type: SoundType, volume: number, repeatCount: number) {
  const [isPlaying, setIsPlaying] = useState(false);

  function toggle() {
    if (isPlaying) return stop();
    setIsPlaying(true);
    playAlarm({ type, volume, repeatCount, onEnded: () => setIsPlaying(false) });
  }

  function stop() {
    stopAlarm();
    setIsPlaying(false);
  }

  useEffect(() => {
    return () => stopAlarm();
  }, []);

  return { isPlaying, toggle, stop };
}

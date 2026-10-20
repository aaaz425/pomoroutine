import { useEffect, useState } from 'react';
import type { SoundType } from '@pomoroutine/shared';
import { playAlarm, stopAlarm } from '@/lib/sound';

export function useSoundPreview(type: SoundType, volume: number, repeatCount: number) {
  const [isPlaying, setIsPlaying] = useState(false);

  function toggle() {
    if (isPlaying) return stop();
    setIsPlaying(true);
    void playAlarm({ type, volume, repeatCount, onEnded: () => setIsPlaying(false) });
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

import { deriveElapsedMinutes } from '@pomoroutine/shared';
import { useTimerStore } from '@/store/StoreProvider';

// tick 소유는 TimerEngine((app)/_layout.tsx에 싱글턴 마운트)이 담당 — 이 훅은 순수 읽기 전용
export function useTimer() {
  const startedAt = useTimerStore((s) => s.startedAt);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const phase = useTimerStore((s) => s.phase);
  const mode = useTimerStore((s) => s.mode);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const focusMinutes = useTimerStore((s) => s.settings.focusMinutes);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);
  const runningDisplaySeconds = useTimerStore((s) => s.runningDisplaySeconds);

  // 정지 중이거나 TimerEngine의 첫 tick 전에는 store 값 직접 사용
  const idleSeconds = mode === 'free' ? accFocusSeconds : remainingSeconds;
  const displaySeconds = startedAt !== null ? (runningDisplaySeconds ?? idleSeconds) : idleSeconds;

  const elapsedMinutes = deriveElapsedMinutes({
    mode,
    displaySeconds,
    cycleCount,
    focusMinutes,
    phase,
  });

  return {
    displaySeconds,
    isRunning: startedAt !== null,
    phase,
    mode,
    cycleCount,
    elapsedMinutes,
  };
}

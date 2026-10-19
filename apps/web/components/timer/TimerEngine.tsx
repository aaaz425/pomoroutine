'use client';

import { useEffect, useRef } from 'react';
import { deriveTimerDisplay, getPhaseEndMessage, TOAST_MESSAGES } from '@pomoroutine/shared';
import { useSettings } from '@/hooks/useSettings';
import { useTimerStore, useHydrated } from '@/store/StoreProvider';
import { playAlarm, sendNotification } from '@/lib/notifications';
import { toast } from '@/lib/toast';
import { useWakeLock } from '@/hooks/useWakeLock';
import { ALARM_MAX_OVERDUE_SECONDS } from '@/lib/constants/ux';

// 싱글턴 tick 소유자 — layout에 한 번만 마운트. 개별 컴포넌트는 useTimer()로 읽기만 한다.
export function TimerEngine() {
  const hydrated = useHydrated();
  const startedAt = useTimerStore((s) => s.startedAt);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const phase = useTimerStore((s) => s.phase);
  const mode = useTimerStore((s) => s.mode);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const totalCycles = useTimerStore((s) => s.settings.totalCycles);
  const focusMinutes = useTimerStore((s) => s.settings.focusMinutes);
  const shortBreakMinutes = useTimerStore((s) => s.settings.shortBreakMinutes);
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);
  const complete = useTimerStore((s) => s.complete);
  const setRunningDisplaySeconds = useTimerStore((s) => s.setRunningDisplaySeconds);

  const soundAlert = useSettings((s) => s.soundAlert);
  const soundType = useSettings((s) => s.soundType);
  const soundVolume = useSettings((s) => s.soundVolume);
  const soundRepeatCount = useSettings((s) => s.soundRepeatCount);
  const browserNotification = useSettings((s) => s.browserNotification);
  const keepScreenAwake = useSettings((s) => s.keepScreenAwake);

  useWakeLock(keepScreenAwake && startedAt !== null);

  // 같은 완료 이벤트에서 중복 알림 방지 — 싱글턴이라 인스턴스 간 경합 없음
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!hydrated || !startedAt) {
      setRunningDisplaySeconds(null);
      return;
    }

    notifiedRef.current = false;

    const tick = () => {
      const result = deriveTimerDisplay({
        phase,
        mode,
        remainingSeconds,
        startedAt,
        accFocusSeconds,
        cycleCount,
        focusMinutes,
        now: Date.now(),
      });

      setRunningDisplaySeconds(result.displaySeconds);

      if (result.justCompleted) {
        if (!notifiedRef.current && result.overdueSeconds <= ALARM_MAX_OVERDUE_SECONDS) {
          notifiedRef.current = true;
          const message = getPhaseEndMessage({ phase, cycleCount, totalCycles, shortBreakMinutes });
          if (soundAlert)
            playAlarm({ type: soundType, volume: soundVolume, repeatCount: soundRepeatCount });
          if (browserNotification) sendNotification(message.title, message.body);
          if (document.visibilityState === 'visible') toast(TOAST_MESSAGES.phaseEnded(message));
        }
        complete();
      }
    };

    // 첫 tick 비동기화 — effect 내 동기 setState 방지
    const firstTick = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') tick();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearTimeout(firstTick);
      clearInterval(id);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [
    hydrated,
    startedAt,
    remainingSeconds,
    complete,
    phase,
    mode,
    accFocusSeconds,
    cycleCount,
    focusMinutes,
    totalCycles,
    shortBreakMinutes,
    soundAlert,
    soundType,
    soundVolume,
    soundRepeatCount,
    browserNotification,
    setRunningDisplaySeconds,
  ]);

  return null;
}

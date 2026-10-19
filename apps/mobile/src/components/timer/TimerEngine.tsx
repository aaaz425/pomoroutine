import { useEffect, useRef } from 'react';
import { AppState } from 'react-native';
import {
  deriveTimerDisplay,
  getPhaseEndMessage,
  getPhaseEndSchedule,
  TOAST_MESSAGES,
} from '@pomoroutine/shared';
import { useTimerStore, useSettingsStore, useHydrated } from '@/store/StoreProvider';
import { syncTimerNotifications } from '@/lib/notifications';
import { playAlarm } from '@/lib/sound';
import { toast } from '@/lib/toast';
import { ALARM_MAX_OVERDUE_SECONDS } from '@/constants/ux';
import { useKeepAwake } from '@/hooks/useKeepAwake';

// 싱글턴 tick 소유자 — (app)/_layout.tsx에 한 번만 마운트. 개별 컴포넌트는 useTimer()로 읽기만 한다.
export function TimerEngine() {
  const hydrated = useHydrated();
  const startedAt = useTimerStore((s) => s.startedAt);
  const remainingSeconds = useTimerStore((s) => s.remainingSeconds);
  const phase = useTimerStore((s) => s.phase);
  const mode = useTimerStore((s) => s.mode);
  const cycleCount = useTimerStore((s) => s.cycleCount);
  const settings = useTimerStore((s) => s.settings);
  const focusMinutes = settings.focusMinutes;
  const accFocusSeconds = useTimerStore((s) => s.accFocusSeconds);
  const complete = useTimerStore((s) => s.complete);
  const setRunningDisplaySeconds = useTimerStore((s) => s.setRunningDisplaySeconds);
  const soundAlert = useSettingsStore((s) => s.soundAlert);
  const soundType = useSettingsStore((s) => s.soundType);
  const soundVolume = useSettingsStore((s) => s.soundVolume);
  const soundRepeatCount = useSettingsStore((s) => s.soundRepeatCount);
  const keepScreenAwake = useSettingsStore((s) => s.keepScreenAwake);

  useKeepAwake(keepScreenAwake && startedAt !== null);

  // 같은 완료 이벤트에서 complete()가 중복 호출되지 않도록 방지 — 싱글턴이라 인스턴스 간 경합 없음
  const notifiedRef = useRef(false);

  useEffect(() => {
    if (!hydrated) return;
    const alerts =
      startedAt !== null && mode === 'pomodoro'
        ? getPhaseEndSchedule({ phase, cycleCount, startedAt, remainingSeconds, settings })
        : [];
    void syncTimerNotifications(alerts, soundAlert);
  }, [hydrated, startedAt, mode, phase, cycleCount, remainingSeconds, settings, soundAlert]);

  useEffect(() => () => void syncTimerNotifications([], false), []);

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

      if (result.justCompleted && !notifiedRef.current) {
        notifiedRef.current = true;
        const isFresh =
          AppState.currentState !== 'background' &&
          result.overdueSeconds <= ALARM_MAX_OVERDUE_SECONDS;
        complete();
        if (isFresh) {
          toast(
            TOAST_MESSAGES.phaseEnded(
              getPhaseEndMessage({
                phase,
                cycleCount,
                totalCycles: settings.totalCycles,
                shortBreakMinutes: settings.shortBreakMinutes,
              }),
            ),
          );
          if (soundAlert) {
            void playAlarm({
              type: soundType,
              volume: soundVolume,
              repeatCount: soundRepeatCount,
            });
          }
        }
      }
    };

    // 첫 tick 비동기화 — effect 내 동기 setState 방지
    const firstTick = setTimeout(tick, 0);
    const id = setInterval(tick, 1000);

    // 앱이 포그라운드로 복귀하면 즉시 재계산 (웹의 visibilitychange에 대응)
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') tick();
    });

    return () => {
      clearTimeout(firstTick);
      clearInterval(id);
      subscription.remove();
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
    settings,
    soundAlert,
    soundType,
    soundVolume,
    soundRepeatCount,
    setRunningDisplaySeconds,
  ]);

  return null;
}

import { createStore } from 'zustand';
import type { TimerMode, TimerPhase, TimerSettings, RawFocusPeriod } from '../types/timer';
import { DEFAULT_TIMER_SETTINGS } from '../constants/defaults';
import { FOCUS_PERIOD_LIMITS, SESSION_LIMITS } from '../constants/limits';
import { isSessionStale } from '../lib/sessionStale';

/** 새로고침/재시작 복구용 스냅샷 — isFocusMode/showAbandonedPrompt(순수 UI 상태)는 제외 */
export interface TimerSnapshot {
  phase: TimerPhase;
  mode: TimerMode; // 'free'는 고정 사이클 없는 카운트업 — phase는 항상 'focus'로 고정해 기존 로직 재사용
  remainingSeconds: number;
  startedAt: number | null; // 현재 실행 구간 시작 시각 (절대 시간 기반 계산용)
  cycleCount: number; // 현재 세션 내 완료된 focus 수
  currentTaskId: string | null;
  settings: TimerSettings;
  sessionEnded: boolean; // true일 때 세션 기록 모달 표시
  sessionStarted: boolean; // true일 때 작업 전환 불가(작업 관리 버튼 숨김)
  sessionStartedAt: number | null; // 세션 첫 start() 시각
  sessionEndedAt: number | null; // 세션 종료 시각 (모달 노출 시점)
  accFocusSeconds: number; // 일시정지 제외 누적 집중 초
  rawFocusPeriods: RawFocusPeriod[]; // 집중 구간 기록 (저장 전 normalizeFocusPeriods 통과 필요)
  lastActiveAt: number | null; // 방치 감지 기준 시각
}

export interface TimerStorePorts {
  /** 상태 변경마다 호출됨 — persistence 담당 앱(웹: localStorage)이 주입 */
  persistSnapshot?: (snapshot: TimerSnapshot) => void;
  /** hydrate()에서 1회 호출 — 저장된 스냅샷을 fallback 위에 병합해 반환. 미주입 시 hydrate()는 사실상 no-op */
  loadSnapshot?: (fallback: TimerSnapshot) => TimerSnapshot;
  onSessionTooShort?: () => void;
}

export interface TimerStore extends TimerSnapshot {
  isFocusMode: boolean; // true일 때 집중 모드 오버레이 표시
  defaultSettings: TimerSettings;
  showAbandonedPrompt: boolean;
  // TimerEngine(싱글턴)이 매초 갱신하는 tick 캐시 — 영속화 대상 아님, 다른 컴포넌트는 읽기만 함
  runningDisplaySeconds: number | null;

  setMode: (mode: TimerMode) => void;
  start: () => void;
  pause: () => void;
  complete: () => void; // 타이머 0 도달 시 훅이 호출
  setCurrentTask: (taskId: string | null) => void;
  completeCycle: () => void;
  updateSettings: (patch: Partial<TimerSettings>) => void;
  syncDefaultSettings: (defaults: TimerSettings) => void;
  endSession: () => void;
  dismissSessionRecord: () => void;
  enterFocusMode: () => void;
  exitFocusMode: () => void;
  dismissAbandonedPrompt: () => void;
  checkAbandoned: () => void;
  hydrate: () => void;
  setRunningDisplaySeconds: (seconds: number | null) => void;
}

function phaseSeconds(settings: TimerSettings): Record<TimerPhase, number> {
  return {
    focus: settings.focusMinutes * 60,
    'short-break': settings.shortBreakMinutes * 60,
  };
}

function phaseEndAt(startedAt: number, remainingSeconds: number, now: number): number {
  return Math.min(now, startedAt + remainingSeconds * 1000);
}

function creditableElapsed(elapsed: number): number {
  return elapsed < FOCUS_PERIOD_LIMITS.MIN_FOCUS_SECONDS ? 0 : elapsed;
}

// 세션 전체 집중 시간이 노이즈 수준이면 기록 자체를 만들지 않고 초기 상태로 되돌림
function resetSessionState(settings: TimerSettings) {
  const seconds = phaseSeconds(settings);
  return {
    phase: 'focus' as const,
    mode: 'pomodoro' as const,
    remainingSeconds: seconds.focus,
    startedAt: null,
    cycleCount: 0,
    currentTaskId: null,
    sessionEnded: false,
    isFocusMode: false,
    showAbandonedPrompt: false,
    sessionStarted: false,
    settings,
    sessionStartedAt: null,
    sessionEndedAt: null,
    accFocusSeconds: 0,
    rawFocusPeriods: [],
    lastActiveAt: null,
  };
}

// 스토어의 모든 액션이 불변 업데이트(spread/새 배열)만 쓰므로 키별 참조 비교로 충분
function snapshotsEqual(a: TimerSnapshot, b: TimerSnapshot): boolean {
  return (Object.keys(a) as (keyof TimerSnapshot)[]).every((key) => a[key] === b[key]);
}

// 새로고침 복구용 스냅샷 — isFocusMode(순수 UI 토글)는 제외
function toTimerSnapshot(s: TimerStore): TimerSnapshot {
  return {
    phase: s.phase,
    mode: s.mode,
    remainingSeconds: s.remainingSeconds,
    startedAt: s.startedAt,
    cycleCount: s.cycleCount,
    currentTaskId: s.currentTaskId,
    settings: s.settings,
    sessionEnded: s.sessionEnded,
    sessionStarted: s.sessionStarted,
    sessionStartedAt: s.sessionStartedAt,
    sessionEndedAt: s.sessionEndedAt,
    accFocusSeconds: s.accFocusSeconds,
    rawFocusPeriods: s.rawFocusPeriods,
    lastActiveAt: s.lastActiveAt,
  };
}

export function createTimerStore(ports: TimerStorePorts = {}) {
  const { persistSnapshot, loadSnapshot, onSessionTooShort } = ports;

  const store = createStore<TimerStore>()((set, get) => {
    const settings = DEFAULT_TIMER_SETTINGS;
    const seconds = phaseSeconds(settings);
    return {
      phase: 'focus',
      mode: 'pomodoro',
      remainingSeconds: seconds.focus,
      startedAt: null,
      cycleCount: 0,
      currentTaskId: null,
      settings,
      defaultSettings: settings,
      sessionEnded: false,
      isFocusMode: false,
      showAbandonedPrompt: false,
      runningDisplaySeconds: null,
      sessionStarted: false,
      sessionStartedAt: null,
      sessionEndedAt: null,
      accFocusSeconds: 0,
      rawFocusPeriods: [],
      lastActiveAt: null,

      setMode: (mode) => set({ mode }),

      start: () =>
        set((state) => {
          const now = Date.now();
          return {
            startedAt: now,
            sessionStarted: true,
            sessionStartedAt: state.sessionStartedAt ?? now,
            lastActiveAt: now,
          };
        }),

      pause: () => {
        const { startedAt, remainingSeconds, phase, accFocusSeconds, rawFocusPeriods } = get();
        if (!startedAt) return;
        const now = Date.now();
        const elapsed = Math.floor((now - startedAt) / 1000);
        const credited = phase === 'focus' ? creditableElapsed(elapsed) : 0;
        set({
          startedAt: null,
          remainingSeconds: Math.max(0, remainingSeconds - elapsed),
          accFocusSeconds: phase === 'focus' ? accFocusSeconds + credited : accFocusSeconds,
          rawFocusPeriods:
            credited > 0 ? [...rawFocusPeriods, { start: startedAt, end: now }] : rawFocusPeriods,
          lastActiveAt: now,
        });
      },

      complete: () => {
        const { startedAt, phase, settings, mode, remainingSeconds } = get();
        if (!startedAt || mode === 'free') return; // free 모드는 자동 완료 없음 — 사용자가 endSession()으로 직접 종료
        if (phase === 'focus') {
          get().completeCycle();
        } else {
          const seconds = phaseSeconds(settings);
          const now = Date.now();
          set({
            phase: 'focus',
            remainingSeconds: seconds.focus,
            startedAt: phaseEndAt(startedAt, remainingSeconds, now),
            lastActiveAt: now,
          });
        }
      },

      setCurrentTask: (taskId) => set({ currentTaskId: taskId }),

      completeCycle: () => {
        const {
          cycleCount,
          settings,
          startedAt,
          remainingSeconds,
          accFocusSeconds,
          rawFocusPeriods,
        } = get();
        const now = Date.now();
        const endedAt = startedAt ? phaseEndAt(startedAt, remainingSeconds, now) : now;
        const rawElapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
        // 탭 방치 등으로 실제 경과가 목표 시간을 넘어도, 목표 시간만큼만 집중 시간으로 인정
        const elapsed = creditableElapsed(Math.min(rawElapsed, remainingSeconds));
        const totalFocus = accFocusSeconds + elapsed;
        const closedPeriods =
          startedAt && elapsed > 0
            ? [...rawFocusPeriods, { start: startedAt, end: startedAt + elapsed * 1000 }]
            : rawFocusPeriods;
        const next = cycleCount + 1;
        if (next >= settings.totalCycles) {
          set({
            cycleCount: next,
            startedAt: null,
            sessionEnded: true,
            isFocusMode: false,
            accFocusSeconds: totalFocus,
            sessionEndedAt: endedAt,
            rawFocusPeriods: closedPeriods,
            lastActiveAt: now,
          });
        } else {
          const seconds = phaseSeconds(settings);
          const nextPhase = seconds['short-break'] === 0 ? 'focus' : 'short-break';
          set({
            cycleCount: next,
            phase: nextPhase,
            remainingSeconds: seconds[nextPhase],
            startedAt: endedAt,
            accFocusSeconds: totalFocus,
            rawFocusPeriods: closedPeriods,
            lastActiveAt: now,
          });
        }
      },

      updateSettings: (patch) => {
        const next = { ...get().settings, ...patch };
        const seconds = phaseSeconds(next);
        set({ settings: next, remainingSeconds: seconds[get().phase] });
      },

      endSession: () => {
        const { startedAt, phase, mode, remainingSeconds, accFocusSeconds, rawFocusPeriods } =
          get();
        const now = Date.now();
        const rawElapsed = startedAt ? Math.floor((now - startedAt) / 1000) : 0;
        // free 모드는 clamp 없이 경과 전체 인정, pomodoro는 목표 시간만큼만 인정(탭 방치 방어)
        const elapsed =
          mode === 'free'
            ? creditableElapsed(rawElapsed)
            : creditableElapsed(Math.min(rawElapsed, remainingSeconds));
        const totalFocus = phase === 'focus' ? accFocusSeconds + elapsed : accFocusSeconds;
        if (totalFocus < SESSION_LIMITS.MIN_SESSION_FOCUS_SECONDS) {
          onSessionTooShort?.();
          set(resetSessionState(get().defaultSettings));
          return;
        }
        const closedPeriods =
          startedAt && phase === 'focus' && elapsed > 0
            ? [...rawFocusPeriods, { start: startedAt, end: startedAt + elapsed * 1000 }]
            : rawFocusPeriods;
        set({
          startedAt: null,
          sessionEnded: true,
          isFocusMode: false,
          accFocusSeconds: totalFocus,
          sessionEndedAt: now,
          rawFocusPeriods: closedPeriods,
          lastActiveAt: now,
        });
      },

      dismissSessionRecord: () => set(resetSessionState(get().defaultSettings)),

      syncDefaultSettings: (defaults) => {
        const { sessionStarted, sessionEnded, phase } = get();
        if (sessionStarted || sessionEnded) {
          set({ defaultSettings: defaults });
          return;
        }
        set({
          defaultSettings: defaults,
          settings: defaults,
          remainingSeconds: phaseSeconds(defaults)[phase],
        });
      },

      enterFocusMode: () => set({ isFocusMode: true }),
      exitFocusMode: () => set({ isFocusMode: false }),

      setRunningDisplaySeconds: (seconds) => set({ runningDisplaySeconds: seconds }),

      // lastActiveAt도 함께 갱신 — 안 그러면 재생 버튼을 다시 눌렀을 때 start()의 방치 검사가 즉시 재발동함
      dismissAbandonedPrompt: () => set({ showAbandonedPrompt: false, lastActiveAt: Date.now() }),

      checkAbandoned: () => {
        const {
          sessionStarted,
          sessionEnded,
          lastActiveAt,
          sessionStartedAt,
          settings,
          startedAt,
          mode,
        } = get();
        if (!sessionStarted || sessionEnded) return;
        if (startedAt !== null && mode === 'pomodoro') return;
        const thresholdMs = phaseSeconds(settings).focus * 1000;
        if (isSessionStale({ lastActiveAt, sessionStartedAt, thresholdMs })) {
          set({ showAbandonedPrompt: true });
        }
      },

      hydrate: () => {
        const fallback = toTimerSnapshot(get());
        const loaded = loadSnapshot ? loadSnapshot(fallback) : fallback;
        // lastActiveAt은 여기서 갱신하지 않음 — StrictMode 이중 마운트로 hydrate가 두 번 불려도 판단이 흔들리지 않아야 함
        set({ ...loaded, showAbandonedPrompt: false });
        get().syncDefaultSettings(get().defaultSettings);
        get().checkAbandoned();
      },
    };
  });

  // subscribe로 상태 변경마다 저장 — 스냅샷 값이 실제로 바뀔 때만 호출(초당 갱신되는 runningDisplaySeconds 제외)
  if (persistSnapshot) {
    store.subscribe((state, prevState) => {
      const snapshot = toTimerSnapshot(state);
      if (snapshotsEqual(snapshot, toTimerSnapshot(prevState))) return;
      persistSnapshot(snapshot);
    });
  }

  return store;
}

export type TimerStoreApi = ReturnType<typeof createTimerStore>;

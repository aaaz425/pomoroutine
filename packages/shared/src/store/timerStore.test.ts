import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createTimerStore, type TimerSnapshot } from './timerStore';
import { DEFAULT_TIMER_SETTINGS } from '../constants/defaults';

beforeEach(() => {
  vi.useFakeTimers();
});

function savedSnapshot(overrides: Partial<TimerSnapshot> = {}): TimerSnapshot {
  return {
    phase: 'focus',
    mode: 'pomodoro',
    remainingSeconds: 25 * 60,
    startedAt: null,
    cycleCount: 0,
    currentTaskId: null,
    settings: DEFAULT_TIMER_SETTINGS,
    sessionEnded: false,
    sessionStarted: true,
    sessionStartedAt: new Date('2024-01-01T00:00:00.000Z').getTime(),
    sessionEndedAt: null,
    accFocusSeconds: 0,
    rawFocusPeriods: [],
    lastActiveAt: null,
    ...overrides,
  };
}

describe('timerStore', () => {
  it('start() — startedAt이 숫자로 설정됨', () => {
    const store = createTimerStore();
    store.getState().start();
    expect(typeof store.getState().startedAt).toBe('number');
  });

  it('pause() — startedAt이 null, remainingSeconds가 elapsed만큼 감소', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const store = createTimerStore();
    store.getState().start();

    vi.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));
    store.getState().pause();

    expect(store.getState().startedAt).toBe(null);
    expect(store.getState().remainingSeconds).toBe(25 * 60 - 10);
  });

  it('reset() — remainingSeconds가 현재 phase 기본값으로 복원', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const store = createTimerStore();
    store.getState().start();
    vi.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));
    store.getState().pause();
    store.getState().reset();

    expect(store.getState().remainingSeconds).toBe(25 * 60);
    expect(store.getState().startedAt).toBe(null);
  });

  it('completeCycle() — cycleCount +1, short-break로 전환', () => {
    const store = createTimerStore();
    store.getState().completeCycle();

    expect(store.getState().cycleCount).toBe(1);
    expect(store.getState().phase).toBe('short-break');
    expect(typeof store.getState().startedAt).toBe('number');
  });

  it('completeCycle() — 휴식이 0분이면 short-break를 건너뛰고 바로 focus로 전환', () => {
    const store = createTimerStore();
    store.getState().updateSettings({ shortBreakMinutes: 0 });
    store.getState().completeCycle();

    expect(store.getState().cycleCount).toBe(1);
    expect(store.getState().phase).toBe('focus');
    expect(store.getState().remainingSeconds).toBe(DEFAULT_TIMER_SETTINGS.focusMinutes * 60);
  });

  it('completeCycle() — totalCycles(4)회 완료 후 sessionEnded가 true로 설정', () => {
    let now = new Date('2024-01-01T00:00:00.000Z').getTime();
    vi.setSystemTime(now);
    const store = createTimerStore();
    for (let i = 0; i < 4; i++) {
      store.getState().start();
      now += 6000; // 5초 미만 노이즈로 드롭되지 않도록 충분히 경과
      vi.setSystemTime(now);
      store.getState().completeCycle();
    }

    expect(store.getState().cycleCount).toBe(4);
    expect(store.getState().sessionEnded).toBe(true);
  });

  it('complete() — focus 종료 시 completeCycle로 위임되어 short-break로 전환', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const store = createTimerStore();
    store.getState().start();

    vi.setSystemTime(new Date('2024-01-01T00:25:00.000Z'));
    store.getState().complete();

    expect(store.getState().startedAt).toBe(new Date('2024-01-01T00:25:00.000Z').getTime());
    expect(store.getState().phase).toBe('short-break');
    expect(store.getState().cycleCount).toBe(1);
    expect(store.getState().remainingSeconds).toBe(5 * 60);
  });

  it('complete() — short-break 종료 시 focus로 전환되고 cycleCount는 유지', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const store = createTimerStore();
    store.getState().completeCycle(); // focus 1회 완료 → short-break 진입
    store.getState().start();

    vi.setSystemTime(new Date('2024-01-01T00:05:00.000Z'));
    store.getState().complete();

    expect(store.getState().startedAt).toBe(new Date('2024-01-01T00:05:00.000Z').getTime());
    expect(store.getState().phase).toBe('focus');
    expect(store.getState().cycleCount).toBe(1);
    expect(store.getState().remainingSeconds).toBe(25 * 60);
  });

  it('complete() — startedAt이 null(정지 상태)이면 아무 동작도 하지 않음', () => {
    const store = createTimerStore();
    const before = store.getState();

    store.getState().complete();

    expect(store.getState().phase).toBe(before.phase);
    expect(store.getState().cycleCount).toBe(before.cycleCount);
  });

  it('complete() — 마지막 사이클의 focus 종료 시 sessionEnded가 true로 설정', () => {
    const store = createTimerStore();
    for (let i = 0; i < 3; i++) store.getState().completeCycle();
    store.getState().setPhase('focus'); // 3번째 short-break 종료 → 4번째 focus 진입

    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    store.getState().start();
    vi.setSystemTime(new Date('2024-01-01T00:25:00.000Z'));
    store.getState().complete();

    expect(store.getState().cycleCount).toBe(4);
    expect(store.getState().sessionEnded).toBe(true);
  });

  describe('늦게 감지한 완료 따라잡기', () => {
    const T0 = new Date('2024-01-01T00:00:00.000Z').getTime();
    const settings = { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 2 };

    function runningStore() {
      vi.setSystemTime(T0);
      const store = createTimerStore();
      store.getState().updateSettings(settings);
      store.getState().start();
      return store;
    }

    it('complete() — 다음 페이즈는 확인한 시각이 아니라 이전 페이즈의 예정 종료 시각부터 시작', () => {
      const store = runningStore();
      vi.setSystemTime(T0 + 27 * 60 * 1000);

      store.getState().complete();

      expect(store.getState().phase).toBe('short-break');
      expect(store.getState().startedAt).toBe(T0 + 25 * 60 * 1000);
    });

    it('complete() — 휴식 종료도 예정 종료 시각부터 다음 집중을 시작', () => {
      const store = runningStore();
      vi.setSystemTime(T0 + 25 * 60 * 1000);
      store.getState().complete();
      vi.setSystemTime(T0 + 40 * 60 * 1000);

      store.getState().complete();

      expect(store.getState().phase).toBe('focus');
      expect(store.getState().startedAt).toBe(T0 + 30 * 60 * 1000);
    });

    it('complete() 연속 호출 — 모든 사이클이 지났으면 예정대로 진행한 값으로 세션 종료', () => {
      const store = runningStore();
      vi.setSystemTime(T0 + 4 * 60 * 60 * 1000);

      store.getState().complete();
      store.getState().complete();
      store.getState().complete();

      const state = store.getState();
      expect(state.sessionEnded).toBe(true);
      expect(state.cycleCount).toBe(2);
      expect(state.accFocusSeconds).toBe(50 * 60);
      expect(state.sessionEndedAt).toBe(T0 + 55 * 60 * 1000);
      expect(state.rawFocusPeriods).toEqual([
        { start: T0, end: T0 + 25 * 60 * 1000 },
        { start: T0 + 30 * 60 * 1000, end: T0 + 55 * 60 * 1000 },
      ]);
    });

    it('completeCycle() — 예정 종료 전에 호출하면 호출한 시각부터 다음 페이즈 시작', () => {
      const store = runningStore();
      vi.setSystemTime(T0 + 10 * 60 * 1000);

      store.getState().completeCycle();

      expect(store.getState().startedAt).toBe(T0 + 10 * 60 * 1000);
    });
  });

  it('updateSettings() — settings 반영 및 현재 phase remainingSeconds 재계산', () => {
    const store = createTimerStore();
    store.getState().updateSettings({ focusMinutes: 30 });

    expect(store.getState().settings.focusMinutes).toBe(30);
    expect(store.getState().remainingSeconds).toBe(30 * 60);
  });

  describe('focus mode', () => {
    it('enterFocusMode() — isFocusMode가 true로 설정됨', () => {
      const store = createTimerStore();
      store.getState().enterFocusMode();
      expect(store.getState().isFocusMode).toBe(true);
    });

    it('exitFocusMode() — isFocusMode만 false로 설정되고 타이머 상태는 유지됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      store.getState().enterFocusMode();

      store.getState().exitFocusMode();

      expect(store.getState().isFocusMode).toBe(false);
      expect(store.getState().startedAt).not.toBe(null);
    });

    it('endSession() — isFocusMode도 함께 false로 닫힘', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().enterFocusMode();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:30.000Z'));

      store.getState().endSession();

      expect(store.getState().isFocusMode).toBe(false);
      expect(store.getState().sessionEnded).toBe(true);
    });

    it('endSession() — 30초 미만이라 세션이 폐기돼도 isFocusMode는 함께 false로 닫힘', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().enterFocusMode();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:10.000Z'));

      store.getState().endSession();

      expect(store.getState().isFocusMode).toBe(false);
      expect(store.getState().sessionEnded).toBe(false);
    });

    it('completeCycle() — 마지막 사이클 완료 시 isFocusMode도 함께 false로 닫힘', () => {
      let now = new Date('2024-01-01T00:00:00.000Z').getTime();
      vi.setSystemTime(now);
      const store = createTimerStore();
      store.getState().enterFocusMode();
      for (let i = 0; i < 4; i++) {
        store.getState().start();
        now += 6000;
        vi.setSystemTime(now);
        store.getState().completeCycle();
      }

      expect(store.getState().isFocusMode).toBe(false);
      expect(store.getState().sessionEnded).toBe(true);
    });
  });

  describe('sessionStarted', () => {
    it('start() — sessionStarted가 true로 설정됨', () => {
      const store = createTimerStore();
      store.getState().start();
      expect(store.getState().sessionStarted).toBe(true);
    });

    it('dismissSessionRecord() — sessionStarted가 false로 초기화됨', () => {
      const store = createTimerStore();
      store.getState().start();
      store.getState().endSession();

      store.getState().dismissSessionRecord();

      expect(store.getState().sessionStarted).toBe(false);
    });
  });

  describe('시간 추적 (sessionStartedAt / accFocusSeconds)', () => {
    it('start() — sessionStartedAt이 첫 호출 시각으로 설정됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      expect(store.getState().sessionStartedAt).toBe(
        new Date('2024-01-01T00:00:00.000Z').getTime(),
      );
    });

    it('start() — 재개 시 sessionStartedAt을 덮어쓰지 않음', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      const first = store.getState().sessionStartedAt;

      vi.setSystemTime(new Date('2024-01-01T00:05:00.000Z'));
      store.getState().pause();
      store.getState().start();

      expect(store.getState().sessionStartedAt).toBe(first);
    });

    it('pause() — focus 중 accFocusSeconds에 경과 시간 누적', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:05:00.000Z'));
      store.getState().pause();

      expect(store.getState().accFocusSeconds).toBe(300);
    });

    it('pause() — 경과 시간이 5초 미만이면 accFocusSeconds/rawFocusPeriods에 반영 안 됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:00:04.000Z'));
      store.getState().pause();

      expect(store.getState().accFocusSeconds).toBe(0);
      expect(store.getState().rawFocusPeriods).toEqual([]);
    });

    it('pause() — 경과 시간이 정확히 5초면 정상 반영됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:00:05.000Z'));
      store.getState().pause();

      expect(store.getState().accFocusSeconds).toBe(5);
      expect(store.getState().rawFocusPeriods).toHaveLength(1);
    });

    it('pause() — remainingSeconds는 5초 미만이어도 실제 경과만큼 정상 감소', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().pause();

      expect(store.getState().remainingSeconds).toBe(25 * 60 - 3);
    });

    it('pause() — short-break 중에는 accFocusSeconds 변경 없음', () => {
      const store = createTimerStore();
      store.getState().completeCycle(); // → short-break

      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:05:00.000Z'));
      store.getState().pause();

      expect(store.getState().accFocusSeconds).toBe(0);
    });

    it('completeCycle() — focus 경과 시간이 accFocusSeconds에 누적됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:25:00.000Z'));
      store.getState().completeCycle();

      expect(store.getState().accFocusSeconds).toBe(1500);
    });

    it('completeCycle() — 탭 방치로 목표 시간을 초과해도 accFocusSeconds는 목표 시간만큼만 증가', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T03:00:00.000Z')); // 3시간 방치 (목표는 25분)
      store.getState().completeCycle();

      expect(store.getState().accFocusSeconds).toBe(25 * 60);
    });

    it('completeCycle() — 방치 시 rawFocusPeriods의 end도 목표 시간만큼만 캡됨', () => {
      const startedAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      vi.setSystemTime(startedAt);
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T03:00:00.000Z'));
      store.getState().completeCycle();

      expect(store.getState().rawFocusPeriods).toEqual([
        { start: startedAt, end: startedAt + 25 * 60 * 1000 },
      ]);
    });

    it('completeCycle() — 남은 시간이 5초 미만이면 accFocusSeconds/rawFocusPeriods에 반영 안 됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().updateSettings({ focusMinutes: 3 / 60 }); // 3초짜리 focus phase
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().completeCycle();

      expect(store.getState().accFocusSeconds).toBe(0);
      expect(store.getState().rawFocusPeriods).toEqual([]);
    });

    it('completeCycle() — 자동 완료 시에는 총 집중 시간이 5초 미만이어도 세션이 정상 종료됨', () => {
      // 목표 시간을 3초로 낮춰 강제 재현 — endSession()과 달리 자동 완료는 5초 미만 폐기를 적용하지 않기로 결정함
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().updateSettings({ focusMinutes: 3 / 60, totalCycles: 1 }); // 3초짜리 단일 사이클
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().completeCycle();

      expect(store.getState().sessionEnded).toBe(true);
      expect(store.getState().accFocusSeconds).toBe(0);
    });

    it('completeCycle() — 마지막 사이클 완료 시 sessionEndedAt 기록', () => {
      let now = new Date('2024-01-01T01:00:00.000Z').getTime();
      vi.setSystemTime(now);
      const store = createTimerStore();
      for (let i = 0; i < 4; i++) {
        store.getState().start();
        now += 6000;
        vi.setSystemTime(now);
        store.getState().completeCycle();
      }

      expect(store.getState().sessionEndedAt).toBe(now);
    });

    it('endSession() — focus 진행 중 종료 시 경과 시간 accFocusSeconds에 추가', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:10:00.000Z'));
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(600);
      expect(store.getState().sessionEndedAt).toBe(new Date('2024-01-01T00:10:00.000Z').getTime());
    });

    it('endSession() — 탭 방치로 목표 시간을 초과해도 accFocusSeconds는 목표 시간만큼만 증가', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T03:00:00.000Z')); // 3시간 방치 (목표는 25분)
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(25 * 60);
    });

    it('endSession() — 세션 전체 집중 시간이 30초 미만이면 기록되지 않고 초기 상태로 리셋됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().updateSettings({ focusMinutes: 3 / 60 }); // 3초짜리 focus phase
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(0);
      expect(store.getState().sessionEnded).toBe(false);
      expect(store.getState().sessionStarted).toBe(false);
    });

    it('endSession() — 세션 전체 집중 시간이 정확히 30초면 정상적으로 종료됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:00:30.000Z'));
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(30);
      expect(store.getState().sessionEnded).toBe(true);
    });

    it('endSession() — 여러 사이클 누적으로 30초 이상이면 마지막 구간이 짧아도 정상 종료됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:10:00.000Z'));
      store.getState().pause(); // accFocusSeconds = 600

      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:10:02.000Z')); // 이번 구간은 2초(5초 미만, 크레딧 안 됨)
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(600); // 앞선 누적은 유지, 마지막 2초만 미반영
      expect(store.getState().sessionEnded).toBe(true);
    });

    it('dismissSessionRecord() — 시간 추적 필드 초기화', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      vi.setSystemTime(new Date('2024-01-01T00:10:00.000Z'));
      store.getState().endSession();
      store.getState().dismissSessionRecord();

      expect(store.getState().sessionStartedAt).toBe(null);
      expect(store.getState().sessionEndedAt).toBe(null);
      expect(store.getState().accFocusSeconds).toBe(0);
    });
  });

  describe('자유 스톱워치 모드', () => {
    it('setMode() — mode가 반영됨', () => {
      const store = createTimerStore();
      store.getState().setMode('free');
      expect(store.getState().mode).toBe('free');
    });

    it('complete() — free 모드에서는 아무 동작도 하지 않음(자동 완료 없음)', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().setMode('free');
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T01:00:00.000Z'));
      store.getState().complete();

      expect(store.getState().cycleCount).toBe(0);
      expect(store.getState().sessionEnded).toBe(false);
      expect(typeof store.getState().startedAt).toBe('number');
    });

    it('endSession() — free 모드는 remainingSeconds(목표 시간)와 무관하게 경과 전체를 인정', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().setMode('free');
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T01:10:00.000Z'));
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(70 * 60);
      expect(store.getState().sessionEnded).toBe(true);
    });

    it('endSession() — free 모드도 30초 미만이면 기록되지 않고 초기화됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().setMode('free');
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().endSession();

      expect(store.getState().accFocusSeconds).toBe(0);
      expect(store.getState().sessionEnded).toBe(false);
    });

    it('dismissSessionRecord() — mode가 기본값(pomodoro)으로 복원됨', () => {
      const store = createTimerStore();
      store.getState().setMode('free');
      store.getState().start();
      store.getState().endSession();

      store.getState().dismissSessionRecord();

      expect(store.getState().mode).toBe('pomodoro');
    });
  });

  describe('초기값 및 설정 복원', () => {
    it('생성 시점에는 항상 기본값으로 시작함 (loadSnapshot 미호출)', () => {
      const store = createTimerStore();

      expect(store.getState().settings.focusMinutes).toBe(25);
      expect(store.getState().remainingSeconds).toBe(25 * 60);
    });

    it('setCurrentTask() — 작업 선택과 해제는 타이머 설정을 바꾸지 않음', () => {
      const store = createTimerStore();
      store.getState().updateSettings({ focusMinutes: 45 });

      store.getState().setCurrentTask('task-1');
      store.getState().setCurrentTask(null);

      expect(store.getState().settings.focusMinutes).toBe(45);
      expect(store.getState().remainingSeconds).toBe(45 * 60);
    });

    it('dismissSessionRecord() — 설정이 기본값으로 복원됨', () => {
      const store = createTimerStore();
      store.getState().updateSettings({ focusMinutes: 45, totalCycles: 2 });
      store.getState().start();
      store.getState().endSession();

      store.getState().dismissSessionRecord();

      expect(store.getState().settings.focusMinutes).toBe(25);
      expect(store.getState().remainingSeconds).toBe(25 * 60);
      expect(store.getState().currentTaskId).toBe(null);
    });
  });

  describe('syncDefaultSettings()', () => {
    const userDefaults = { focusMinutes: 50, shortBreakMinutes: 10, totalCycles: 2 };

    it('대기 상태에서는 설정과 remainingSeconds에 바로 반영됨', () => {
      const store = createTimerStore();

      store.getState().syncDefaultSettings(userDefaults);

      expect(store.getState().settings).toEqual(userDefaults);
      expect(store.getState().remainingSeconds).toBe(50 * 60);
    });

    it('세션 진행 중에는 현재 설정을 유지함', () => {
      const store = createTimerStore();
      store.getState().start();

      store.getState().syncDefaultSettings(userDefaults);

      expect(store.getState().settings).toEqual(DEFAULT_TIMER_SETTINGS);
      expect(store.getState().defaultSettings).toEqual(userDefaults);
    });

    it('dismissSessionRecord()는 사용자 기본값으로 복원함', () => {
      const store = createTimerStore();
      store.getState().syncDefaultSettings(userDefaults);
      store.getState().updateSettings({ focusMinutes: 30 });
      store.getState().start();
      store.getState().endSession();
      store.getState().dismissSessionRecord();
      expect(store.getState().settings).toEqual(userDefaults);
      expect(store.getState().remainingSeconds).toBe(50 * 60);
    });

    it('hydrate() — 대기 상태 스냅샷의 이전 설정 대신 사용자 기본값을 적용함', () => {
      const store = createTimerStore({
        loadSnapshot: () =>
          savedSnapshot({
            sessionStarted: false,
            sessionStartedAt: null,
            settings: { focusMinutes: 15, shortBreakMinutes: 5, totalCycles: 4 },
            remainingSeconds: 15 * 60,
          }),
      });
      store.getState().syncDefaultSettings(userDefaults);

      store.getState().hydrate();

      expect(store.getState().settings).toEqual(userDefaults);
      expect(store.getState().remainingSeconds).toBe(50 * 60);
    });
  });

  describe('hydrate() — 방치된 세션 감지', () => {
    it('lastActiveAt이 세션의 집중 시간(focusMinutes)을 초과하면 showAbandonedPrompt가 true로 설정됨', () => {
      const lastActiveAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ lastActiveAt });
      vi.setSystemTime(new Date('2024-01-01T00:25:01.000Z')); // focusMinutes(25분) 초과

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(true);
    });

    it('lastActiveAt이 세션의 집중 시간 이내면 showAbandonedPrompt는 false', () => {
      const lastActiveAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ lastActiveAt });
      vi.setSystemTime(new Date('2024-01-01T00:20:00.000Z')); // focusMinutes(25분) 이내

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('focusMinutes를 길게 설정한 세션은 그만큼 임계값도 늘어남', () => {
      const lastActiveAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({
        lastActiveAt,
        settings: { focusMinutes: 90, shortBreakMinutes: 5, totalCycles: 4 },
      });
      vi.setSystemTime(new Date('2024-01-01T01:00:00.000Z')); // 60분 경과 — 25분 기준이면 stale이지만 90분 기준이면 아님

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('진행 중인 세션이 없으면(sessionStarted: false) 오래됐어도 showAbandonedPrompt는 false', () => {
      const lastActiveAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ lastActiveAt, sessionStarted: false });
      vi.setSystemTime(new Date('2024-01-02T00:00:00.000Z')); // 하루 경과

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('lastActiveAt이 없는(마이그레이션 이전) 데이터는 sessionStartedAt으로 폴백해 판단', () => {
      const sessionStartedAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ sessionStartedAt, lastActiveAt: null });
      vi.setSystemTime(new Date('2024-01-01T00:30:00.000Z')); // focusMinutes(25분) 초과

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(true);
    });

    it('dismissAbandonedPrompt() — showAbandonedPrompt를 false로 되돌림', () => {
      const lastActiveAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ lastActiveAt });
      vi.setSystemTime(new Date('2024-01-01T00:25:01.000Z'));
      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      store.getState().dismissAbandonedPrompt();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });
    it('실행 중인 포모도로 타이머는 오래됐어도 방치로 보지 않음', () => {
      const startedAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ startedAt, lastActiveAt: startedAt });
      vi.setSystemTime(new Date('2024-01-01T03:00:00.000Z'));

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('실행 중인 자유 모드는 집중 시간을 넘기면 방치로 봄', () => {
      const startedAt = new Date('2024-01-01T00:00:00.000Z').getTime();
      const snapshot = savedSnapshot({ mode: 'free', startedAt, lastActiveAt: startedAt });
      vi.setSystemTime(new Date('2024-01-01T03:00:00.000Z'));

      const store = createTimerStore({ loadSnapshot: () => snapshot });
      store.getState().hydrate();

      expect(store.getState().showAbandonedPrompt).toBe(true);
    });
  });

  describe('checkAbandoned() — 탭을 안 닫고 방치된 경우 주기 체크', () => {
    it('일시정지 후 세션의 집중 시간(focusMinutes)을 넘게 지나면 showAbandonedPrompt가 true로 설정됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      store.getState().pause();

      vi.setSystemTime(new Date('2024-01-01T00:25:01.000Z')); // 기본 focusMinutes(25분) 초과
      store.getState().checkAbandoned();

      expect(store.getState().showAbandonedPrompt).toBe(true);
    });

    it('일시정지 후 세션의 집중 시간 이내면 showAbandonedPrompt가 false로 유지됨', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      store.getState().pause();

      vi.setSystemTime(new Date('2024-01-01T00:20:00.000Z')); // 기본 focusMinutes(25분) 이내
      store.getState().checkAbandoned();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('진행 중인 세션이 없으면(sessionStarted: false) 검사하지 않음', () => {
      const store = createTimerStore();

      store.getState().checkAbandoned();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });

    it('dismissAbandonedPrompt() 이후에는 lastActiveAt이 갱신돼 즉시 재검사해도 false', () => {
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore();
      store.getState().start();
      store.getState().pause();

      vi.setSystemTime(new Date('2024-01-01T00:25:01.000Z'));
      store.getState().checkAbandoned();
      store.getState().dismissAbandonedPrompt();
      store.getState().checkAbandoned();

      expect(store.getState().showAbandonedPrompt).toBe(false);
    });
  });

  describe('ports (DI)', () => {
    it('persistSnapshot() — 상태 변경마다 호출됨', () => {
      const persistSnapshot = vi.fn();
      const store = createTimerStore({ persistSnapshot });
      persistSnapshot.mockClear();

      store.getState().start();

      expect(persistSnapshot).toHaveBeenCalled();
    });

    it('persistSnapshot() — runningDisplaySeconds만 바뀌면 호출 안 됨(스냅샷에 미포함)', () => {
      const persistSnapshot = vi.fn();
      const store = createTimerStore({ persistSnapshot });
      persistSnapshot.mockClear();

      store.getState().setRunningDisplaySeconds(123);

      expect(persistSnapshot).not.toHaveBeenCalled();
    });

    it('onSessionTooShort() — 30초 미만 세션 폐기 시 호출됨', () => {
      const onSessionTooShort = vi.fn();
      vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
      const store = createTimerStore({ onSessionTooShort });
      store.getState().start();

      vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
      store.getState().endSession();

      expect(onSessionTooShort).toHaveBeenCalledOnce();
    });

    it('hydrate() — loadSnapshot 미주입 시 기본 상태를 그대로 유지(no-op)', () => {
      const store = createTimerStore();

      store.getState().hydrate();

      expect(store.getState().remainingSeconds).toBe(25 * 60);
      expect(store.getState().showAbandonedPrompt).toBe(false);
    });
  });
});

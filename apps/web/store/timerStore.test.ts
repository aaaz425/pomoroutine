import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toast } from '@/lib/toast';
import { createTimerStore } from '@/store/timerStore';
import { STORAGE_KEYS } from '@/types';

vi.mock('@/lib/toast', () => ({ toast: vi.fn() }));

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
  vi.mocked(toast).mockClear();
});

// 타이머 상태머신 자체(pause/complete/completeCycle 등)는 packages/shared/src/store/timerStore.test.ts에서
// 검증됨. 여기서는 web 래퍼가 shared store에 주입하는 포트(localStorage 영속화 + Zod 검증, toast)만 검증한다.
describe('timerStore (web ports)', () => {
  it('persistSnapshot() — 상태 변경 시 STORAGE_KEYS.activeTimer에 실제로 저장됨', () => {
    const store = createTimerStore();
    store.getState().start();

    const raw = localStorage.getItem(STORAGE_KEYS.activeTimer);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).startedAt).toBe(store.getState().startedAt);
  });

  it('hydrate() — localStorage에 저장된 유효한 스냅샷을 Zod 검증 후 반영함', () => {
    localStorage.setItem(
      STORAGE_KEYS.activeTimer,
      JSON.stringify({
        phase: 'focus',
        mode: 'pomodoro',
        remainingSeconds: 10 * 60,
        startedAt: null,
        cycleCount: 2,
        currentTaskId: null,
        settings: { focusMinutes: 25, shortBreakMinutes: 5, totalCycles: 4 },
        sessionEnded: false,
        sessionStarted: true,
        sessionStartedAt: new Date('2024-01-01T00:00:00.000Z').getTime(),
        sessionEndedAt: null,
        accFocusSeconds: 900,
        rawFocusPeriods: [],
      }),
    );

    const store = createTimerStore();
    store.getState().hydrate();

    expect(store.getState().remainingSeconds).toBe(10 * 60);
    expect(store.getState().cycleCount).toBe(2);
  });

  it('hydrate() — localStorage 값이 스키마와 맞지 않으면 기본값으로 안전하게 시작함', () => {
    localStorage.setItem(STORAGE_KEYS.activeTimer, JSON.stringify({ broken: true }));

    const store = createTimerStore();
    store.getState().hydrate();

    expect(store.getState().remainingSeconds).toBe(25 * 60);
  });

  it('onSessionTooShort() — 30초 미만 세션 폐기 시 실제 toast()가 호출됨', () => {
    vi.setSystemTime(new Date('2024-01-01T00:00:00.000Z'));
    const store = createTimerStore();
    store.getState().start();

    vi.setSystemTime(new Date('2024-01-01T00:00:03.000Z'));
    store.getState().endSession();

    expect(toast).toHaveBeenCalledOnce();
  });
});

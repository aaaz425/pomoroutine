'use client';

import { createTimerStore as createSharedTimerStore } from '@pomoroutine/shared';
import type { TimerStorePorts, TimerSnapshot } from '@pomoroutine/shared';
import { ActiveTimerStateSchema, STORAGE_KEYS } from '@/types';
import { toast } from '@/lib/toast';
import { loadFromStorage, saveToStorage } from '@/lib/storage';
import { TOAST_MESSAGES } from '@/lib/constants/messages';

export const createTimerStore = () => {
  const ports: TimerStorePorts = {
    persistSnapshot: (snapshot) => saveToStorage(STORAGE_KEYS.activeTimer, snapshot),
    loadSnapshot: (fallback: TimerSnapshot) =>
      loadFromStorage(STORAGE_KEYS.activeTimer, ActiveTimerStateSchema, fallback),
    onSessionTooShort: () => toast(TOAST_MESSAGES.sessionTooShort),
  };
  return createSharedTimerStore(ports);
};

export type { TimerStore, TimerStoreApi } from '@pomoroutine/shared';

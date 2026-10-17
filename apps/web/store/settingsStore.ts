'use client';

import { createStore } from 'zustand';
import { arrayMove } from '@dnd-kit/sortable';
import { toast } from '@/lib/toast';
import { createMutationTracker } from '@pomoroutine/shared';
import { fetchSettings, saveSettings } from '@/lib/supabase/settings';
import {
  type TimerSettings,
  type AppSettings,
  type SoundType,
  DEFAULT_TIMER_SETTINGS,
} from '@/types';
import { MOTIVATIONAL_MESSAGES } from '@/lib/constants/messages';
import { INPUT_LIMITS } from '@/lib/constants/limits';
import { generateId } from '@/lib/utils';
import { TOAST_MESSAGES } from '@/lib/constants/messages';

const DEFAULT_SETTINGS: AppSettings = {
  nickname: '',
  browserNotification: false,
  soundAlert: true,
  soundType: 'sine',
  soundVolume: 70,
  soundRepeatCount: 2,
  motivationalMessages: MOTIVATIONAL_MESSAGES,
  defaultTimerSettings: DEFAULT_TIMER_SETTINGS,
  keepScreenAwake: false,
};

function generateMessageIds(count: number): string[] {
  return Array.from({ length: count }, () => generateId());
}

interface SettingsStore {
  nickname: string;
  browserNotification: boolean;
  soundAlert: boolean;
  soundType: SoundType;
  soundVolume: number;
  soundRepeatCount: number;
  motivationalMessages: string[];
  messageIds: string[];
  defaultTimerSettings: TimerSettings;
  keepScreenAwake: boolean;

  setNickname: (nickname: string) => Promise<void>;
  setTimerDefaults: (settings: TimerSettings) => Promise<void>;
  setBrowserNotification: (enabled: boolean) => Promise<void>;
  setKeepScreenAwake: (enabled: boolean) => Promise<void>;
  setSoundAlert: (enabled: boolean) => Promise<void>;
  setSoundType: (type: SoundType) => Promise<void>;
  setSoundVolume: (volume: number) => Promise<void>;
  setSoundRepeatCount: (count: number) => Promise<void>;
  addMessage: (message: string) => Promise<void>;
  updateMessage: (index: number, message: string) => Promise<void>;
  deleteMessage: (index: number) => Promise<void>;
  reorderMessages: (fromId: string, toId: string) => Promise<void>;
  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

function toAppSettings(s: SettingsStore): AppSettings {
  return {
    nickname: s.nickname,
    browserNotification: s.browserNotification,
    soundAlert: s.soundAlert,
    soundType: s.soundType,
    soundVolume: s.soundVolume,
    soundRepeatCount: s.soundRepeatCount,
    motivationalMessages: s.motivationalMessages,
    defaultTimerSettings: s.defaultTimerSettings,
    keepScreenAwake: s.keepScreenAwake,
  };
}

export const createSettingsStore = () =>
  createStore<SettingsStore>()((set, get) => {
    const tracker = createMutationTracker();

    // 낙관적으로 먼저 반영하고, 저장 실패하면 이전 값으로 되돌린다
    async function savePatch(
      previous: Partial<SettingsStore>,
      patch: Partial<SettingsStore>,
    ): Promise<void> {
      set(patch);
      const { error } = await saveSettings(toAppSettings(get()));
      if (error) {
        set(previous);
        toast(TOAST_MESSAGES.settingsSaveFailed);
      }
    }
    const persistChange = tracker.track(savePatch);

    return {
      ...DEFAULT_SETTINGS,
      messageIds: generateMessageIds(DEFAULT_SETTINGS.motivationalMessages.length),

      setNickname: (nickname) => persistChange({ nickname: get().nickname }, { nickname }),

      setTimerDefaults: (defaultTimerSettings) =>
        persistChange(
          { defaultTimerSettings: get().defaultTimerSettings },
          { defaultTimerSettings },
        ),

      setBrowserNotification: (browserNotification) =>
        persistChange({ browserNotification: get().browserNotification }, { browserNotification }),

      setKeepScreenAwake: (keepScreenAwake) =>
        persistChange({ keepScreenAwake: get().keepScreenAwake }, { keepScreenAwake }),

      setSoundAlert: (soundAlert) =>
        persistChange({ soundAlert: get().soundAlert }, { soundAlert }),

      setSoundType: (soundType) => persistChange({ soundType: get().soundType }, { soundType }),

      setSoundVolume: (soundVolume) =>
        persistChange(
          { soundVolume: get().soundVolume },
          { soundVolume: Math.max(0, Math.min(100, Math.round(soundVolume))) },
        ),

      setSoundRepeatCount: (soundRepeatCount) =>
        persistChange(
          { soundRepeatCount: get().soundRepeatCount },
          { soundRepeatCount: Math.max(1, Math.min(5, Math.round(soundRepeatCount))) },
        ),

      addMessage: async (message) => {
        const curr = get().motivationalMessages;
        const ids = get().messageIds;
        if (curr.length >= INPUT_LIMITS.MESSAGE_COUNT_MAX) return;
        await persistChange(
          { motivationalMessages: curr, messageIds: ids },
          { motivationalMessages: [...curr, message], messageIds: [...ids, generateId()] },
        );
      },

      updateMessage: async (index, message) => {
        const curr = get().motivationalMessages;
        const trimmed = message.trim();
        if (!trimmed || index < 0 || index >= curr.length) return;
        const motivationalMessages = curr.map((m, i) => (i === index ? trimmed : m));
        await persistChange({ motivationalMessages: curr }, { motivationalMessages });
      },

      deleteMessage: async (index) => {
        const curr = get().motivationalMessages;
        const ids = get().messageIds;
        if (curr.length <= INPUT_LIMITS.MESSAGE_COUNT_MIN) return;
        const motivationalMessages = curr.filter((_, i) => i !== index);
        const messageIds = ids.filter((_, i) => i !== index);
        await persistChange(
          { motivationalMessages: curr, messageIds: ids },
          { motivationalMessages, messageIds },
        );
      },

      reorderMessages: async (fromId, toId) => {
        const messages = get().motivationalMessages;
        const ids = get().messageIds;
        const from = ids.indexOf(fromId);
        const to = ids.indexOf(toId);
        if (from === -1 || to === -1) return;
        const next = arrayMove(messages, from, to);
        const nextIds = arrayMove(ids, from, to);
        await persistChange(
          { motivationalMessages: messages, messageIds: ids },
          { motivationalMessages: next, messageIds: nextIds },
        );
      },

      hydrate: async () => {
        const settings = await fetchSettings();
        if (settings)
          set({
            ...settings,
            messageIds: generateMessageIds(settings.motivationalMessages.length),
          });
      },

      refresh: () =>
        tracker.refreshWhenIdle(fetchSettings, (settings) => {
          if (!settings) return;
          const { messageIds } = get();
          set({
            ...settings,
            messageIds:
              messageIds.length === settings.motivationalMessages.length
                ? messageIds
                : generateMessageIds(settings.motivationalMessages.length),
          });
        }),
    };
  });

export type SettingsStoreApi = ReturnType<typeof createSettingsStore>;
export type { SettingsStore };

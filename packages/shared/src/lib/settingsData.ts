import type { QueryClient } from '@tanstack/react-query';
import type { AppSettings, SoundType } from '../types/settings';
import type { TimerSettings } from '../types/timer';
import { TOAST_MESSAGES, type ToastMessage } from '../constants/toastMessages';
import { INPUT_LIMITS, SOUND_LIMITS } from '../constants/limits';
import { QUERY_KEYS } from '../constants/queryKeys';
import { DEFAULT_APP_SETTINGS } from '../constants/defaults';
import { moveItem } from './taskData';

export interface SettingsDataApi {
  fetchSettings: () => Promise<AppSettings | null>;
  saveSettings: (settings: AppSettings) => Promise<{ error: boolean }>;
  toast: (message: ToastMessage) => void;
}

export function createSettingsQuery(api: SettingsDataApi) {
  return {
    queryKey: QUERY_KEYS.settings,
    queryFn: async (): Promise<AppSettings> => {
      const settings = await api.fetchSettings();
      if (!settings) throw new Error('settings fetch failed');
      return settings;
    },
    staleTime: Infinity,
    refetchOnWindowFocus: 'always',
  } as const;
}

export function toMessageKeys(messages: string[]): string[] {
  const seen = new Map<string, number>();
  return messages.map((message) => {
    const count = seen.get(message) ?? 0;
    seen.set(message, count + 1);
    return `${count}:${message}`;
  });
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(value)));
}

function createSettingsActions(queryClient: QueryClient, api: SettingsDataApi) {
  let pendingCount = 0;
  const current = () =>
    queryClient.getQueryData<AppSettings>(QUERY_KEYS.settings) ?? DEFAULT_APP_SETTINGS;

  async function save(patch: Partial<AppSettings>): Promise<void> {
    pendingCount++;
    await queryClient.cancelQueries({ queryKey: QUERY_KEYS.settings });
    const before = current();
    const previous = Object.fromEntries(
      Object.keys(patch).map((key) => [key, before[key as keyof AppSettings]]),
    ) as Partial<AppSettings>;
    queryClient.setQueryData<AppSettings>(QUERY_KEYS.settings, { ...before, ...patch });
    try {
      const { error } = await api.saveSettings(current());
      if (error) {
        queryClient.setQueryData<AppSettings>(QUERY_KEYS.settings, { ...current(), ...previous });
        api.toast(TOAST_MESSAGES.settingsSaveFailed);
      }
    } finally {
      pendingCount--;
      if (pendingCount === 0) void queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
    }
  }

  return {
    setNickname: (nickname: string) => save({ nickname }),
    setTimerDefaults: (defaultTimerSettings: TimerSettings) => save({ defaultTimerSettings }),
    setBrowserNotification: (browserNotification: boolean) => save({ browserNotification }),
    setKeepScreenAwake: (keepScreenAwake: boolean) => save({ keepScreenAwake }),
    setSoundAlert: (soundAlert: boolean) => save({ soundAlert }),
    setSoundType: (soundType: SoundType) => save({ soundType }),
    setSoundVolume: (volume: number) =>
      save({ soundVolume: clamp(volume, SOUND_LIMITS.VOLUME_MIN, SOUND_LIMITS.VOLUME_MAX) }),
    setSoundRepeatCount: (count: number) =>
      save({ soundRepeatCount: clamp(count, SOUND_LIMITS.REPEAT_MIN, SOUND_LIMITS.REPEAT_MAX) }),

    addMessage: async (message: string) => {
      const messages = current().motivationalMessages;
      if (messages.length >= INPUT_LIMITS.MESSAGE_COUNT_MAX) return;
      await save({ motivationalMessages: [...messages, message] });
    },

    updateMessage: async (index: number, message: string) => {
      const messages = current().motivationalMessages;
      const trimmed = message.trim();
      if (!trimmed || index < 0 || index >= messages.length) return;
      await save({ motivationalMessages: messages.map((m, i) => (i === index ? trimmed : m)) });
    },

    deleteMessage: async (index: number) => {
      const messages = current().motivationalMessages;
      if (messages.length <= INPUT_LIMITS.MESSAGE_COUNT_MIN) return;
      await save({ motivationalMessages: messages.filter((_, i) => i !== index) });
    },

    reorderMessages: async (from: number, to: number) => {
      const next = moveItem(current().motivationalMessages, from, to);
      if (next) await save({ motivationalMessages: next });
    },
  };
}

export type SettingsActions = ReturnType<typeof createSettingsActions>;

const actionsByClient = new WeakMap<QueryClient, SettingsActions>();

export function getSettingsActions(
  queryClient: QueryClient,
  api: SettingsDataApi,
): SettingsActions {
  let actions = actionsByClient.get(queryClient);
  if (!actions) {
    actions = createSettingsActions(queryClient, api);
    actionsByClient.set(queryClient, actions);
  }
  return actions;
}

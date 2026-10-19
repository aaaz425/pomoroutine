'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_APP_SETTINGS, getSettingsActions, type AppSettings } from '@pomoroutine/shared';
import { settingsDataApi, settingsQuery } from '@/lib/query/settings';

export function useSettings<T>(selector: (settings: AppSettings) => T): T {
  const { data } = useQuery({ ...settingsQuery, select: selector });
  return data ?? selector(DEFAULT_APP_SETTINGS);
}

export function useSettingsActions() {
  return getSettingsActions(useQueryClient(), settingsDataApi);
}

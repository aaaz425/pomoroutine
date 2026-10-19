import { createSettingsQuery, type SettingsDataApi } from '@pomoroutine/shared';
import { fetchSettings, saveSettings } from '@/lib/supabase/settings';
import { toast } from '@/lib/toast';

export const settingsDataApi: SettingsDataApi = { fetchSettings, saveSettings, toast };

export const settingsQuery = createSettingsQuery(settingsDataApi);

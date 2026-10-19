import { createSettingsDataApi, createSettingsQuery } from '@pomoroutine/shared';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export const settingsDataApi = createSettingsDataApi(createClient, toast);

export const settingsQuery = createSettingsQuery(settingsDataApi);

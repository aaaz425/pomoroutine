import { createSettingsDataApi, createSettingsQuery } from '@pomoroutine/shared';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export const settingsDataApi = createSettingsDataApi(() => supabase, toast);

export const settingsQuery = createSettingsQuery(settingsDataApi);

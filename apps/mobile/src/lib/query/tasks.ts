import { createTaskDataApi, createTaskQueries } from '@pomoroutine/shared';
import { supabase } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export const taskDataApi = createTaskDataApi(() => supabase, toast);

export const taskQueries = createTaskQueries(taskDataApi);

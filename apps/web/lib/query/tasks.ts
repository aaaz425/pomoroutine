import { createTaskDataApi, createTaskQueries } from '@pomoroutine/shared';
import { createClient } from '@/lib/supabase/client';
import { toast } from '@/lib/toast';

export const taskDataApi = createTaskDataApi(createClient, toast);

export const taskQueries = createTaskQueries(taskDataApi);

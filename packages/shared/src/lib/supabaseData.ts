import type { SupabaseClient } from '@supabase/supabase-js';
import { AppSettingsSchema, CategorySchema, TaskSchema } from '../schemas';
import type { ToastMessage } from '../constants/toastMessages';
import type { AppSettings } from '../types/settings';
import type { Category, Task } from '../types/task';
import type { TaskDataApi } from './taskData';
import type { SettingsDataApi } from './settingsData';

type GetClient = () => SupabaseClient;
type Toast = (message: ToastMessage) => void;

interface TaskRow {
  id: string;
  title: string;
  category_id: string;
  created_at: string;
}

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

interface SettingsRow {
  nickname: string;
  browser_notification: boolean;
  sound_alert: boolean;
  sound_type: string;
  sound_volume: number;
  sound_repeat_count: number;
  motivational_messages: string[];
  default_focus_minutes: number;
  default_short_break_minutes: number;
  default_total_cycles: number;
  keep_screen_awake: boolean;
}

const TASK_COLUMNS = 'id, title, category_id, created_at';
const CATEGORY_COLUMNS = 'id, name, color';

export function toTask(row: TaskRow): Task | null {
  const parsed = TaskSchema.safeParse({
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    createdAt: row.created_at,
  });
  return parsed.success ? parsed.data : null;
}

export function toCategory(row: CategoryRow): Category | null {
  const parsed = CategorySchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export function toAppSettings(row: SettingsRow): AppSettings | null {
  const parsed = AppSettingsSchema.safeParse({
    nickname: row.nickname,
    browserNotification: row.browser_notification,
    soundAlert: row.sound_alert,
    soundType: row.sound_type,
    soundVolume: row.sound_volume,
    soundRepeatCount: row.sound_repeat_count,
    motivationalMessages: row.motivational_messages,
    defaultTimerSettings: {
      focusMinutes: row.default_focus_minutes,
      shortBreakMinutes: row.default_short_break_minutes,
      totalCycles: row.default_total_cycles,
    },
    keepScreenAwake: row.keep_screen_awake,
  });
  return parsed.success ? parsed.data : null;
}

function toSettingsRow(settings: AppSettings) {
  return {
    nickname: settings.nickname,
    browser_notification: settings.browserNotification,
    sound_alert: settings.soundAlert,
    sound_type: settings.soundType,
    sound_volume: settings.soundVolume,
    sound_repeat_count: settings.soundRepeatCount,
    motivational_messages: settings.motivationalMessages,
    default_focus_minutes: settings.defaultTimerSettings.focusMinutes,
    default_short_break_minutes: settings.defaultTimerSettings.shortBreakMinutes,
    default_total_cycles: settings.defaultTimerSettings.totalCycles,
    keep_screen_awake: settings.keepScreenAwake,
    updated_at: new Date().toISOString(),
  };
}

function parseRows<R, T>(rows: R[], parse: (row: R) => T | null) {
  const items = rows.map(parse).filter((item): item is T => item !== null);
  return { items, invalidCount: rows.length - items.length };
}

const failed = (error: unknown) => ({ error: error !== null });

export function createTaskDataApi(getClient: GetClient, toast: Toast): TaskDataApi {
  return {
    fetchTasks: async () => {
      const { data, error } = await getClient()
        .from('tasks')
        .select(TASK_COLUMNS)
        .order('position', { ascending: true });
      if (error || !data) return null;
      const { items, invalidCount } = parseRows(data, toTask);
      return { tasks: items, invalidCount };
    },
    fetchCategories: async () => {
      const { data, error } = await getClient()
        .from('categories')
        .select(CATEGORY_COLUMNS)
        .order('position', { ascending: true });
      if (error || !data) return null;
      const { items, invalidCount } = parseRows(data, toCategory);
      return { categories: items, invalidCount };
    },
    insertTask: async ({ title, categoryId }) => {
      const { data, error } = await getClient()
        .from('tasks')
        .insert({ title, category_id: categoryId })
        .select(TASK_COLUMNS)
        .single();
      return error || !data ? null : toTask(data);
    },
    updateTask: async (id, patch) => {
      const row: Record<string, unknown> = {};
      if (patch.title !== undefined) row.title = patch.title;
      if (patch.categoryId !== undefined) row.category_id = patch.categoryId;
      const { error } = await getClient().from('tasks').update(row).eq('id', id);
      return failed(error);
    },
    deleteTask: async (id) => {
      const { error } = await getClient().from('tasks').delete().eq('id', id);
      return failed(error);
    },
    reorderTasks: async (orderedIds) => {
      const { error } = await getClient().rpc('reorder_tasks', { p_ids: orderedIds });
      return failed(error);
    },
    insertCategory: async ({ name, color, position }) => {
      const { data, error } = await getClient()
        .from('categories')
        .insert({ name, color, position })
        .select(CATEGORY_COLUMNS)
        .single();
      return error || !data ? null : toCategory(data);
    },
    updateCategory: async (id, { name, color }) => {
      const { error } = await getClient().from('categories').update({ name, color }).eq('id', id);
      return failed(error);
    },
    deleteCategory: async (id) => {
      const { error } = await getClient().from('categories').delete().eq('id', id);
      if (!error) return { error: false, blocked: false };
      return { error: true, blocked: error.code === '23503' };
    },
    reorderCategories: async (orderedIds) => {
      const { error } = await getClient().rpc('reorder_categories', { p_ids: orderedIds });
      return failed(error);
    },
    toast,
  };
}

export function createSettingsDataApi(getClient: GetClient, toast: Toast): SettingsDataApi {
  return {
    fetchSettings: async () => {
      const { data, error } = await getClient().from('settings').select('*').single();
      return error || !data ? null : toAppSettings(data);
    },
    saveSettings: async (settings) => {
      const supabase = getClient();
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return { error: true };
      const { error } = await supabase
        .from('settings')
        .update(toSettingsRow(settings))
        .eq('user_id', session.user.id);
      return failed(error);
    },
    toast,
  };
}

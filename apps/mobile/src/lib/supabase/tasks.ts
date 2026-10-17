import { supabase } from '@/lib/supabase/client';
import { TaskSchema, type Task } from '@/types/tasks';

interface TaskRow {
  id: string;
  title: string;
  category_id: string;
  created_at: string;
}

const SELECT_COLUMNS = 'id, title, category_id, created_at';

export function toTask(row: TaskRow): Task | null {
  const parsed = TaskSchema.safeParse({
    id: row.id,
    title: row.title,
    categoryId: row.category_id,
    createdAt: row.created_at,
  });
  return parsed.success ? parsed.data : null;
}

export async function fetchTasks(): Promise<{ tasks: Task[]; invalidCount: number } | null> {
  const { data, error } = await supabase
    .from('tasks')
    .select(SELECT_COLUMNS)
    .order('position', { ascending: true });
  if (error || !data) return null;
  const tasks = data.map(toTask).filter((t): t is Task => t !== null);
  return { tasks, invalidCount: data.length - tasks.length };
}

export async function insertTask(input: {
  title: string;
  categoryId: string;
}): Promise<Task | null> {
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      title: input.title,
      category_id: input.categoryId,
    })
    .select(SELECT_COLUMNS)
    .single();
  if (error || !data) return null;
  return toTask(data);
}

export async function updateTask(
  id: string,
  patch: Partial<{
    title: string;
    categoryId: string;
  }>,
): Promise<{ error: boolean }> {
  const row: Record<string, unknown> = {};
  if (patch.title !== undefined) row.title = patch.title;
  if (patch.categoryId !== undefined) row.category_id = patch.categoryId;

  const { error } = await supabase.from('tasks').update(row).eq('id', id);
  return { error: error !== null };
}

export async function deleteTask(id: string): Promise<{ error: boolean }> {
  const { error } = await supabase.from('tasks').delete().eq('id', id);
  return { error: error !== null };
}

// 목록 순서(position)를 배열 순서대로 다시 씀 — add/reorder 후 호출
export async function reorderTasks(orderedIds: string[]): Promise<{ error: boolean }> {
  const { error } = await supabase.rpc('reorder_tasks', { p_ids: orderedIds });
  return { error: error !== null };
}

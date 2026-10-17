import { supabase } from '@/lib/supabase/client';
import { CategorySchema, type Category } from '@/types/tasks';

interface CategoryRow {
  id: string;
  name: string;
  color: string;
}

export function toCategory(row: CategoryRow): Category | null {
  const parsed = CategorySchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export async function fetchCategories(): Promise<{
  categories: Category[];
  invalidCount: number;
} | null> {
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, color')
    .order('position', { ascending: true });
  if (error || !data) return null;
  const categories = data.map(toCategory).filter((c): c is Category => c !== null);
  return { categories, invalidCount: data.length - categories.length };
}

export async function insertCategory(input: {
  name: string;
  color: Category['color'];
  position: number;
}): Promise<Category | null> {
  const { data, error } = await supabase
    .from('categories')
    .insert({ name: input.name, color: input.color, position: input.position })
    .select('id, name, color')
    .single();
  if (error || !data) return null;
  return toCategory(data);
}

export async function updateCategory(
  id: string,
  input: { name: string; color: Category['color'] },
): Promise<{ error: boolean }> {
  const { error } = await supabase
    .from('categories')
    .update({ name: input.name, color: input.color })
    .eq('id', id);
  return { error: error !== null };
}

// on delete restrict — 참조하는 작업이 있으면 Postgres가 23503(foreign_key_violation)으로 막는다.
export async function deleteCategory(id: string): Promise<{ error: boolean; blocked: boolean }> {
  const { error } = await supabase.from('categories').delete().eq('id', id);
  if (!error) return { error: false, blocked: false };
  return { error: true, blocked: error.code === '23503' };
}

// 목록 순서(position)를 배열 순서대로 다시 씀 — add/reorder 후 호출
export async function reorderCategories(orderedIds: string[]): Promise<{ error: boolean }> {
  const { error } = await supabase.rpc('reorder_categories', { p_ids: orderedIds });
  return { error: error !== null };
}

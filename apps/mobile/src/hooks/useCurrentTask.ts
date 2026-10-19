import { useTasks, useCategories } from '@/hooks/useTasks';
import { useTimerStore } from '@/store/StoreProvider';

export function useCurrentTask() {
  const currentTaskId = useTimerStore((s) => s.currentTaskId);
  const tasks = useTasks();
  const categories = useCategories();

  const task = tasks.find((t) => t.id === currentTaskId) ?? null;
  const category = task ? (categories.find((c) => c.id === task.categoryId) ?? null) : null;

  return { task, category };
}

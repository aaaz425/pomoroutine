import { useQuery, useQueryClient } from '@tanstack/react-query';
import { DEFAULT_CATEGORIES, getTaskActions, type Task, type Category } from '@pomoroutine/shared';
import { taskDataApi, taskQueries } from '@/lib/query/tasks';

const NO_TASKS: Task[] = [];

export function useTasks(): Task[] {
  return useQuery(taskQueries.tasks).data ?? NO_TASKS;
}

export function useCategories(): Category[] {
  return useQuery(taskQueries.categories).data ?? DEFAULT_CATEGORIES;
}

export function useTaskActions() {
  return getTaskActions(useQueryClient(), taskDataApi);
}

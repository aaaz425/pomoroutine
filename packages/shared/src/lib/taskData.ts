import type { QueryClient } from '@tanstack/react-query';
import type { Task, Category } from '../types/task';
import { TOAST_MESSAGES, type ToastMessage } from '../constants/toastMessages';
import { INPUT_LIMITS } from '../constants/limits';
import { QUERY_KEYS } from '../constants/queryKeys';

type WriteResult = Promise<{ error: boolean }>;

export interface TaskDataApi {
  fetchTasks: () => Promise<{ tasks: Task[]; invalidCount: number } | null>;
  fetchCategories: () => Promise<{ categories: Category[]; invalidCount: number } | null>;
  insertTask: (input: { title: string; categoryId: string }) => Promise<Task | null>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'categoryId'>>) => WriteResult;
  deleteTask: (id: string) => WriteResult;
  reorderTasks: (orderedIds: string[]) => WriteResult;
  insertCategory: (input: {
    name: string;
    color: string;
    position: number;
  }) => Promise<Category | null>;
  updateCategory: (id: string, input: { name: string; color: string }) => WriteResult;
  deleteCategory: (id: string) => Promise<{ error: boolean; blocked: boolean }>;
  reorderCategories: (orderedIds: string[]) => WriteResult;
  toast: (message: ToastMessage) => void;
}

type ListKey = typeof QUERY_KEYS.tasks | typeof QUERY_KEYS.categories;

class RequestError extends Error {
  constructor(readonly toastMessage: ToastMessage) {
    super(toastMessage.message);
  }
}

async function check(request: WriteResult, toastMessage: ToastMessage): Promise<void> {
  const { error } = await request;
  if (error) throw new RequestError(toastMessage);
}

export function moveItem<T>(list: T[], from: number, to: number): T[] | null {
  if (from < 0 || to < 0 || from >= list.length || to >= list.length) return null;
  const next = list.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

export function createTaskQueries(api: TaskDataApi) {
  function warnInvalid(client: QueryClient, queryKey: ListKey, invalidCount: number) {
    if (invalidCount > 0 && client.getQueryData(queryKey) === undefined) {
      api.toast(TOAST_MESSAGES.sessionsInvalid(invalidCount));
    }
  }

  const freshUntilFocus = { staleTime: Infinity, refetchOnWindowFocus: 'always' } as const;

  return {
    tasks: {
      ...freshUntilFocus,
      queryKey: QUERY_KEYS.tasks,
      queryFn: async ({ client }: { client: QueryClient }): Promise<Task[]> => {
        const result = await api.fetchTasks();
        if (!result) throw new Error('tasks fetch failed');
        warnInvalid(client, QUERY_KEYS.tasks, result.invalidCount);
        return result.tasks;
      },
    },
    categories: {
      ...freshUntilFocus,
      queryKey: QUERY_KEYS.categories,
      queryFn: async ({ client }: { client: QueryClient }): Promise<Category[]> => {
        const result = await api.fetchCategories();
        if (!result) throw new Error('categories fetch failed');
        warnInvalid(client, QUERY_KEYS.categories, result.invalidCount);
        return result.categories;
      },
    },
  };
}

function createTaskActions(queryClient: QueryClient, api: TaskDataApi) {
  const pendingCount = new Map<ListKey, number>();
  const getTasks = () => queryClient.getQueryData<Task[]>(QUERY_KEYS.tasks) ?? [];
  const getCategories = () => queryClient.getQueryData<Category[]>(QUERY_KEYS.categories) ?? [];

  async function mutate<T>(
    queryKey: ListKey,
    optimistic: ((list: T[]) => T[]) | null,
    request: () => Promise<void>,
  ): Promise<boolean> {
    pendingCount.set(queryKey, (pendingCount.get(queryKey) ?? 0) + 1);
    await queryClient.cancelQueries({ queryKey });
    const previous = queryClient.getQueryData<T[]>(queryKey);
    if (previous && optimistic) queryClient.setQueryData(queryKey, optimistic(previous));
    try {
      await request();
      return true;
    } catch (error) {
      if (previous && optimistic) queryClient.setQueryData(queryKey, previous);
      if (error instanceof RequestError) api.toast(error.toastMessage);
      return false;
    } finally {
      const remaining = (pendingCount.get(queryKey) ?? 1) - 1;
      pendingCount.set(queryKey, remaining);
      if (remaining === 0) void queryClient.invalidateQueries({ queryKey });
    }
  }

  return {
    addTask: async (input: { title: string; categoryId: string }): Promise<string | null> => {
      let insertedId: string | null = null;
      await mutate<Task>(QUERY_KEYS.tasks, null, async () => {
        const inserted = await api.insertTask({
          title: input.title.trim(),
          categoryId: input.categoryId,
        });
        if (!inserted) throw new RequestError(TOAST_MESSAGES.taskAddFailed);
        const next = [inserted, ...getTasks()];
        await api.reorderTasks(next.map((t) => t.id));
        queryClient.setQueryData(QUERY_KEYS.tasks, next);
        insertedId = inserted.id;
      });
      return insertedId;
    },

    updateTask: async (id: string, patch: Partial<Pick<Task, 'title' | 'categoryId'>>) => {
      const next = { ...patch, title: patch.title?.trim() ?? patch.title };
      await mutate<Task>(
        QUERY_KEYS.tasks,
        (tasks) =>
          tasks.map((t) => (t.id === id ? { ...t, ...next, title: next.title ?? t.title } : t)),
        () => check(api.updateTask(id, next), TOAST_MESSAGES.taskSaveFailed),
      );
    },

    deleteTask: async (id: string) => {
      await mutate<Task>(
        QUERY_KEYS.tasks,
        (tasks) => tasks.filter((t) => t.id !== id),
        () => check(api.deleteTask(id), TOAST_MESSAGES.taskDeleteFailed),
      );
    },

    reorderTasks: async (from: number, to: number) => {
      const next = moveItem(getTasks(), from, to);
      if (!next) return;
      await mutate<Task>(
        QUERY_KEYS.tasks,
        () => next,
        () => check(api.reorderTasks(next.map((t) => t.id)), TOAST_MESSAGES.reorderFailed),
      );
    },

    addCategory: async ({ name, color }: { name: string; color: string }) => {
      const position = getCategories().length;
      if (position >= INPUT_LIMITS.CATEGORIES_MAX) return;
      await mutate<Category>(QUERY_KEYS.categories, null, async () => {
        const inserted = await api.insertCategory({ name: name.trim(), color, position });
        if (!inserted) throw new RequestError(TOAST_MESSAGES.categoryAddFailed);
        queryClient.setQueryData(QUERY_KEYS.categories, [...getCategories(), inserted]);
      });
    },

    updateCategory: async (id: string, { name, color }: { name: string; color: string }) => {
      const trimmed = name.trim();
      await mutate<Category>(
        QUERY_KEYS.categories,
        (categories) => categories.map((c) => (c.id === id ? { ...c, name: trimmed, color } : c)),
        () =>
          check(
            api.updateCategory(id, { name: trimmed, color }),
            TOAST_MESSAGES.categorySaveFailed,
          ),
      );
    },

    deleteCategory: async (id: string) => {
      if (getTasks().some((t) => t.categoryId === id)) {
        api.toast(TOAST_MESSAGES.categoryInUse);
        return;
      }
      await mutate<Category>(
        QUERY_KEYS.categories,
        (categories) => categories.filter((c) => c.id !== id),
        async () => {
          const { error, blocked } = await api.deleteCategory(id);
          if (blocked) throw new RequestError(TOAST_MESSAGES.categoryInUse);
          if (error) throw new RequestError(TOAST_MESSAGES.categoryDeleteFailed);
        },
      );
    },

    reorderCategories: async (from: number, to: number) => {
      const next = moveItem(getCategories(), from, to);
      if (!next) return;
      await mutate<Category>(
        QUERY_KEYS.categories,
        () => next,
        () => check(api.reorderCategories(next.map((c) => c.id)), TOAST_MESSAGES.reorderFailed),
      );
    },
  };
}

export type TaskActions = ReturnType<typeof createTaskActions>;

const actionsByClient = new WeakMap<QueryClient, TaskActions>();

export function getTaskActions(queryClient: QueryClient, api: TaskDataApi): TaskActions {
  let actions = actionsByClient.get(queryClient);
  if (!actions) {
    actions = createTaskActions(queryClient, api);
    actionsByClient.set(queryClient, actions);
  }
  return actions;
}

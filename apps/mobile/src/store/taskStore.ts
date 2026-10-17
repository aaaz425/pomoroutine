import { createStore } from 'zustand';
import { INPUT_LIMITS, createMutationTracker } from '@pomoroutine/shared';
import { generateId } from '@/lib/generateId';
import { toast } from '@/lib/toast';
import { withRetry } from '@/lib/retry';
import {
  fetchTasks,
  insertTask as insertTaskRow,
  updateTask as updateTaskRow,
  deleteTask as deleteTaskRow,
  reorderTasks as reorderTasksRows,
} from '@/lib/supabase/tasks';
import {
  fetchCategories,
  insertCategory as insertCategoryRow,
  updateCategory as updateCategoryRow,
  deleteCategory as deleteCategoryRow,
  reorderCategories as reorderCategoriesRows,
} from '@/lib/supabase/categories';
import { insertSession as insertSessionRow } from '@/lib/supabase/sessions';
import type { Task, Category } from '@/types/tasks';
import type { Session } from '@/types/sessions';
import { TOAST_MESSAGES } from '@pomoroutine/shared';

// fetchCategories 실패 시에만 쓰는 폴백 — DB 트리거(handle_new_user) 기본값과 이름을 맞춤
const DEFAULT_CATEGORIES: Category[] = [
  { id: '1', name: '공부', color: '#3b82f6' },
  { id: '2', name: '업무', color: '#22c55e' },
  { id: '3', name: '운동', color: '#f97316' },
  { id: '4', name: '독서', color: '#a855f7' },
  { id: '5', name: '기타', color: '#6b7280' },
];

interface TaskStore {
  tasks: Task[];
  categories: Category[];

  addTask: (input: { title: string; categoryId: string }) => Promise<string | null>;
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'categoryId'>>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  reorderTasks: (fromIndex: number, toIndex: number) => Promise<void>;

  addCategory: (input: { name: string; color: Category['color'] }) => Promise<void>;
  updateCategory: (id: string, input: { name: string; color: Category['color'] }) => Promise<void>;
  deleteCategory: (id: string) => Promise<{ blocked: boolean }>;
  reorderCategories: (fromIndex: number, toIndex: number) => Promise<void>;

  /** 성공 여부를 반환 — 실패 시 호출부가 폼을 유지하고 재시도할 수 있도록 함 */
  addSession: (input: Omit<Session, 'id'>) => Promise<boolean>;

  hydrate: () => Promise<void>;
  refresh: () => Promise<void>;
}

function arrayMove<T>(arr: T[], from: number, to: number): T[] {
  const next = arr.slice();
  const [moved] = next.splice(from, 1);
  next.splice(to, 0, moved);
  return next;
}

type PendingIds = Map<string, Promise<string | null>>;

// tempId 생성 중 update/delete가 겹치면 나중 도착한 insert reconcile이 그 변경을 덮어쓰므로, 생성이 끝날 때까지 기다렸다가 실제 DB id로 동작한다
function trackPendingId(pending: PendingIds, tempId: string, promise: Promise<string | null>) {
  pending.set(tempId, promise);
}

function resolvePendingId(pending: PendingIds, id: string): Promise<string | null> {
  return pending.get(id) ?? Promise.resolve(id);
}

export const createTaskStore = () => {
  const pendingTaskIds: PendingIds = new Map();
  const pendingCategoryIds: PendingIds = new Map();
  const tracker = createMutationTracker();

  return createStore<TaskStore>()((set, get) => ({
    tasks: [],
    categories: [],

    addTask: tracker.track(async ({ title, categoryId }) => {
      const trimmed = title.trim();
      const tempId = generateId();
      const optimisticTask: Task = {
        id: tempId,
        title: trimmed,
        categoryId,
        createdAt: new Date().toISOString(),
      };
      // 스냅샷을 직접 set하면 대기 중 다른 변경을 덮어쓰므로 state 콜백으로 최신 상태 위에서 반영
      set((state) => ({ tasks: [optimisticTask, ...state.tasks] }));

      const idPromise = (async () => {
        const inserted = await insertTaskRow({ title: trimmed, categoryId });

        if (!inserted) {
          set((state) => ({ tasks: state.tasks.filter((t) => t.id !== tempId) }));
          toast(TOAST_MESSAGES.taskAddFailed);
          return null;
        }

        set((state) => ({ tasks: state.tasks.map((t) => (t.id === tempId ? inserted : t)) }));
        void reorderTasksRows(get().tasks.map((t) => t.id));
        return inserted.id;
      })();
      trackPendingId(pendingTaskIds, tempId, idPromise);
      return idPromise;
    }),

    updateTask: tracker.track(async (id, patch) => {
      const targetId = await resolvePendingId(pendingTaskIds, id);
      if (!targetId) return;
      const original = get().tasks.find((t) => t.id === targetId);
      if (!original) return;
      const title = patch.title?.trim();
      set((state) => ({
        tasks: state.tasks.map((t) =>
          t.id === targetId ? { ...t, ...patch, title: title ?? t.title } : t,
        ),
      }));
      const { error } = await updateTaskRow(targetId, { ...patch, title });
      if (error) {
        set((state) => ({ tasks: state.tasks.map((t) => (t.id === targetId ? original : t)) }));
        toast(TOAST_MESSAGES.taskSaveFailed);
      }
    }),

    deleteTask: tracker.track(async (id) => {
      const targetId = await resolvePendingId(pendingTaskIds, id);
      if (!targetId) return;
      const index = get().tasks.findIndex((t) => t.id === targetId);
      if (index === -1) return;
      const target = get().tasks[index];
      set((state) => ({ tasks: state.tasks.filter((t) => t.id !== targetId) }));
      const { error } = await deleteTaskRow(targetId);
      if (error) {
        set((state) => {
          const tasks = [...state.tasks];
          tasks.splice(Math.min(index, tasks.length), 0, target);
          return { tasks };
        });
        toast(TOAST_MESSAGES.taskDeleteFailed);
      }
    }),

    reorderTasks: tracker.track(async (fromIndex, toIndex) => {
      const previousTasks = get().tasks;
      const next = arrayMove(previousTasks, fromIndex, toIndex);
      set({ tasks: next });
      const { error } = await reorderTasksRows(next.map((t) => t.id));
      if (error) {
        set({ tasks: previousTasks });
        toast(TOAST_MESSAGES.reorderFailed);
      }
    }),

    addCategory: tracker.track(async ({ name, color }) => {
      if (get().categories.length >= INPUT_LIMITS.CATEGORIES_MAX) return;
      const trimmed = name.trim();
      const tempId = generateId();
      const position = get().categories.length;
      set((state) => ({
        categories: [...state.categories, { id: tempId, name: trimmed, color }],
      }));

      const idPromise = (async () => {
        const inserted = await insertCategoryRow({ name: trimmed, color, position });
        if (!inserted) {
          set((state) => ({ categories: state.categories.filter((c) => c.id !== tempId) }));
          toast(TOAST_MESSAGES.categoryAddFailed);
          return null;
        }
        set((state) => ({
          categories: state.categories.map((c) => (c.id === tempId ? inserted : c)),
        }));
        return inserted.id;
      })();
      trackPendingId(pendingCategoryIds, tempId, idPromise);
      await idPromise;
    }),

    updateCategory: tracker.track(async (id, { name, color }) => {
      const targetId = await resolvePendingId(pendingCategoryIds, id);
      if (!targetId) return;
      const original = get().categories.find((c) => c.id === targetId);
      if (!original) return;
      const trimmed = name.trim();
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === targetId ? { ...c, name: trimmed, color } : c,
        ),
      }));
      const { error } = await updateCategoryRow(targetId, { name: trimmed, color });
      if (error) {
        set((state) => ({
          categories: state.categories.map((c) => (c.id === targetId ? original : c)),
        }));
        toast(TOAST_MESSAGES.categorySaveFailed);
      }
    }),

    deleteCategory: tracker.track(async (id) => {
      const targetId = await resolvePendingId(pendingCategoryIds, id);
      if (!targetId) return { blocked: false };
      const index = get().categories.findIndex((c) => c.id === targetId);
      if (index === -1) return { blocked: false };

      // 참조하는 작업이 있으면 DB에서도 막히지만, 낙관적 삭제 후 롤백되는 깜빡임을 피하려고 미리 로컬에서 걸러낸다
      if (get().tasks.some((t) => t.categoryId === targetId)) {
        return { blocked: true };
      }

      const target = get().categories[index];
      set((state) => ({ categories: state.categories.filter((c) => c.id !== targetId) }));
      const { error, blocked } = await deleteCategoryRow(targetId);
      if (error) {
        set((state) => {
          const categories = [...state.categories];
          categories.splice(Math.min(index, categories.length), 0, target);
          return { categories };
        });
        toast(TOAST_MESSAGES.categoryDeleteFailed);
      }
      return { blocked };
    }),

    reorderCategories: tracker.track(async (fromIndex, toIndex) => {
      const previousCategories = get().categories;
      const next = arrayMove(previousCategories, fromIndex, toIndex);
      set({ categories: next });
      const { error } = await reorderCategoriesRows(next.map((c) => c.id));
      if (error) {
        set({ categories: previousCategories });
        toast(TOAST_MESSAGES.reorderFailed);
      }
    }),

    addSession: tracker.track(async (input) => {
      const { error } = await insertSessionRow(input);
      if (error) {
        toast(TOAST_MESSAGES.sessionSaveFailed);
        return false;
      }
      return true;
    }),

    hydrate: async () => {
      const [tasksResult, categoriesResult] = await Promise.all([
        withRetry(fetchTasks),
        withRetry(fetchCategories),
      ]);
      set({
        tasks: tasksResult?.tasks ?? [],
        categories: categoriesResult?.categories ?? DEFAULT_CATEGORIES,
      });

      // 형식이 안 맞는 데이터가 있어 일부 항목이 조용히 빠졌을 때 사용자에게 알림
      const invalidCount = (tasksResult?.invalidCount ?? 0) + (categoriesResult?.invalidCount ?? 0);
      if (invalidCount > 0) {
        toast(TOAST_MESSAGES.sessionsInvalid(invalidCount));
      }
    },

    refresh: () =>
      tracker.refreshWhenIdle(
        () => Promise.all([fetchTasks(), fetchCategories()]),
        ([tasksResult, categoriesResult]) => {
          set((state) => ({
            tasks: tasksResult?.tasks ?? state.tasks,
            categories: categoriesResult?.categories ?? state.categories,
          }));
        },
      ),
  }));
};

export type TaskStoreApi = ReturnType<typeof createTaskStore>;
export type { TaskStore };
